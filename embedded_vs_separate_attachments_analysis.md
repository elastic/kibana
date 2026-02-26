# Embedded vs. Separate Saved Objects for Case Attachments

**Analysis:** Should case attachments be stored as an embedded array on the core case saved object, or as separate saved objects?

---

## Context

There are two approaches under consideration:

1. **Embedded (current branch)** — `attachments[]` array on the cases saved object. In progress (model v9).
2. **Separate v2 (case-attachments)** — New standalone saved object with flexible schema. Defined but unused.

Both replace the legacy `case-comments` saved object (separate SO linked via references), which is being deprecated.

Both approaches target the same backing index: `.kibana_alerting_cases`

---

## What is the Cases Feature?

Cases in Kibana are tools for opening and tracking issues directly within the platform. They function as issue management containers, allowing teams to systematize and monitor problems in one centralized location.

Cases support:

- **Metadata management:** owners, tags, severity levels, status values, assignees
- **Attachments:** alerts, user comments, files, visualizations, actions, external references
- **Custom fields** and case templates
- **Human-readable incremental IDs**
- **External connector integrations** (Jira, ServiceNow, IBM Resilient, webhooks)
- **Space-level isolation** (cases in one Kibana space are invisible to other spaces)

The Cases API supports creating, updating, deleting, searching, and pushing cases to external systems. Attachments (comments, alerts, files) are managed through dedicated sub-APIs on each case.

---

## Key Limits Defined in the Codebase

These constants from `x-pack/platform/plugins/shared/cases/common/constants/index.ts` bound the scale:

| Constant | Value |
|----------|-------|
| `MAX_ALERTS_PER_CASE` | 1,000 |
| `MAX_USER_ACTIONS_PER_CASE` | 10,000 |
| `MAX_COMMENT_LENGTH` | 30,000 characters |
| `MAX_DESCRIPTION_LENGTH` | 30,000 characters |
| `MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES` | 100 |
| `MAX_FILES_PER_CASE` | 100 |
| `MAX_FILE_SIZE` | 100 MB |
| `MAX_OBSERVABLES_PER_CASE` | 50 |
| `MAX_CUSTOM_FIELDS_PER_CASE` | 10 |
| `MAX_BULK_CREATE_ATTACHMENTS` | 100 |
| `MAX_BULK_GET_ATTACHMENTS` | 100 |
| `MAX_DOCS_PER_PAGE` | 10,000 |

---

## How It Works Today (Legacy: case-comments)

The legacy approach stores each attachment as a separate saved object of type `case-comments`, linked to its parent case via the saved object references array. The case saved object maintains denormalized counters (`total_comments`, `total_alerts`, `total_events`) that must be updated separately when attachments change.

Query patterns include:

- **Finding comments by case:** `hasReference` filter on the `case-comments` type
- **Finding cases by alert:** aggregation across `case-comments` to extract parent case IDs from references
- **Counting attachments:** separate aggregation queries against `case-comments`

This works but requires multi-step writes (create comment + update counter) and cross-document joins for reverse lookups (find case by alert ID).

---

## How the Embedded Approach Works (Current Branch)

Model version 9 adds an `attachments` field to the case saved object as an embedded array. Each attachment is an object with an `id` field, a per-attachment `_version` counter, plus all standard attachment attributes (`type`, `comment`, `alertId`, `created_at`, `created_by`, etc.).

The mapping uses `dynamic: false` with only `id` and `type` indexed:

```json
{
  "attachments": {
    "dynamic": false,
    "properties": {
      "id": { "type": "keyword" },
      "type": { "type": "keyword" }
    }
  }
}
```

The `AttachmentService` reads the case document, extracts the embedded array, and performs all filtering, sorting, and pagination in application memory. CRUD operations follow a read-modify-write pattern: read the case, modify the attachments array, write the case back with optimistic concurrency (case SO version check). Each embedded attachment also carries its own `_version` counter that increments independently on updates.

Stats (`total_comments`, `total_alerts`, `total_events`) are recomputed from the full array on every write and persisted atomically alongside the attachments.

References belonging to attachments are stored on the case document's references array using a namespaced convention: `attachment:{attachmentId}:{originalRefName}`.

---

## Pros of Embedding Attachments on the Case Saved Object

### 1. Atomic Operations (Strong Consistency)

This is the single biggest advantage. A single `unsecuredSavedObjectsClient.update()` call writes both the attachment and updated stats (`total_comments`, `total_alerts`, `total_events`) atomically.

With separate saved objects, adding an attachment requires:

- Creating the attachment saved object
- Updating the case saved object counters
- Hoping no crash occurs between steps 1 and 2

This eliminates an entire class of data consistency bugs where counters drift from actual attachment counts, a problem that likely exists with the legacy `case-comments` approach.

### 2. Reduced Query Overhead (Single Read)

`getCaseWithAttachments()` fetches a case and all its attachments in one Elasticsearch GET. With separate saved objects, this requires at minimum a `get` + a `find` (with `hasReference` filter), which is 2 round trips to Elasticsearch. For pages listing multiple cases with attachment counts, this difference multiplies.

### 3. Simplified Reference Management

The namespaced reference pattern (`attachment:{id}:{refName}`) keeps all references on a single document. Import/export of a case automatically includes its attachments with no need for multi-type traversal that the legacy approach requires.

### 4. Elimination of Cross-Document Joins

The `find()` method does filtering, sorting, and pagination entirely in-memory on the embedded array. This avoids the complex aggregation-based joins visible in the legacy `getCaseIdsByAlertId()` pattern, which had to aggregate across `case-comments` references to discover parent case IDs.

### 5. Optimistic Concurrency is Cleaner

With everything on one document, the `version` parameter on updates provides serialized writes naturally. The `bulkDelete` method correctly uses `version: caseSO.version` to prevent lost updates. With separate saved objects, you would need distributed coordination across multiple documents.

---

## Cons of Embedding Attachments on the Case Saved Object

### 1. Document Size Growth (Critical Risk)

This is the most significant concern.

**Worst-case scenario:** A case with 1,000 alert attachments (each containing `alertId`, `index`, `rule`, metadata), plus user comments, plus external references.

**Conservative estimate:**

| Component | Size |
|-----------|------|
| 1,000 alerts x ~500 bytes each | ~500 KB |
| User comments (50 x 10KB average) | ~500 KB |
| Case base fields | ~5 KB |
| **Total** | **~1 MB+** for a heavily-used case |

Elasticsearch's default `http.max_content_length` is 100 MB, so hard limits are unlikely to be hit. However:

- Every single attachment operation **rewrites the entire document**. Adding the 1,000th alert re-serializes and re-indexes all 999 previous alerts plus the full case.
- **Indexing latency grows with document size.** A 1 MB document takes meaningfully longer to index than a 5 KB one.
- The Kibana saved objects framework has **no document-level size validation**. The first indication of a problem would be a mysterious Elasticsearch rejection.

### 2. Write Contention (Hot Document Problem)

All attachment operations serialize on a single document. The `create` method does read-modify-write with optimistic concurrency:

> read case → append attachment → write case (with version check)

If two users simultaneously add comments to the same case, one will get a version conflict. The saved objects framework retries automatically (with exponential backoff, `maxTimeout: 3000`, `retries: 3`, `factor: 2`), but under load (e.g., an automation bulk-attaching 1,000 alerts), this becomes a **hot document bottleneck**. Each retry requires re-reading the increasingly large document.

With separate saved objects, parallel writes create independent documents with no contention. Counter updates on the case saved object still contend, but the blast radius is a small integer update, not a full document rewrite.

### 3. In-Memory Filtering Does Not Scale

The `find()` implementation loads the entire attachment array into Node.js heap, then does filtering, sorting, and pagination in application memory. For a case with 1,000+ attachments, you are deserializing and iterating a large array on every page request.

With separate saved objects, Elasticsearch handles filtering, sorting, and pagination natively at the shard level, which is vastly more efficient.

### 4. Limited Indexing of Attachment Fields

With the current mapping (`dynamic: false`, only `id` and `type` indexed), you cannot use Elasticsearch to:

- Full-text search across comment bodies within a case
- Filter attachments by `created_at` date ranges at the Elasticsearch level
- Query by `alertId` or `eventId` without loading the entire document
- Aggregate attachment statistics across multiple cases efficiently

Additional sub-fields can be selectively indexed under `dynamic: false` without mapping explosion, but there is no field correlation — a multi-field query like `alertId = X AND created_at > yesterday` could cross-match fields from different attachments in the array. For single-field queries (the most common pattern, e.g., "find cases containing alertId X"), this is not a problem.

With the separate `case-attachments` saved object, every indexed field (`type`, `attachmentId`, `data.content` as text, `metadata.actionType`, `created_at`, etc.) is independently queryable with no cross-matching risk.

### 5. ES|QL Has Limited Utility

ES|QL is designed for columnar analytics over indexed fields. With `dynamic: false`, ES|QL queries against `.kibana_alerting_cases` can only see the explicitly indexed sub-fields (`attachments.id` and `attachments.type`). All other attachment data is invisible.

With separate saved objects, ES|QL becomes powerful. For example:

```
FROM .kibana_alerting_cases
| WHERE type == "case-attachments" AND case-attachments.created_at > NOW() - 7 days
| STATS count = COUNT(*) BY case-attachments.type
```

This kind of cross-case attachment analytics (e.g., "how many alerts were attached across all cases this week?") is **impossible** with the embedded approach without loading every case document.

### 6. Migration Complexity for Existing Data

Migrating existing `case-comments` data into the embedded attachments array requires **data reshaping** (moving data from N separate documents into 1 parent document). This is more complex and riskier than a document-to-document transformation. If a case has 500 comments, the migration must:

1. Find all comments for that case
2. Build the embedded array
3. Write the enlarged case document
4. Clean up the old comment documents

Failure partway through leaves data in an inconsistent state. With a separate `case-attachments` saved object, migration is a simpler 1:1 document transformation.

### 7. Import/Export Payload Size

The saved objects import/export API serializes entire documents. A case with hundreds of embedded attachments produces a single large NDJSON line, which can cause memory pressure during import. The separate approach distributes this across many small lines.

### 8. RBAC Considerations

The Cases RBAC model is owner-based: the `owner` field on a case maps to a Kibana solution/feature (e.g., `securitySolution`, `observability`) and determines which users can access the case based on their role privileges. Authorization is enforced at the client layer (`server/client/`) before any service call, using the `Authorization` class which checks privileges via Kibana's Security plugin.

**Key constraint: cases created within a solution will only ever have attachments from that same solution.** This means the attachment's owner is always identical to the case's owner, and per-attachment owner authorization is redundant.

**How RBAC works with the embedded approach:**

The embedded approach simplifies RBAC by eliminating the per-attachment owner concept entirely. Authorization happens once at the case level — if you can access the case, you can access all its attachments. This removes:

- The redundant `owner` field on each attachment (the case's `owner` is the single source of truth)
- Per-attachment authorization checks in the client layer
- The need for `getAndEnsureAuthorizedEntities()` to partition attachments by owner

For cross-case queries (e.g., "find all cases with alert attachments"), the existing `getAuthorizationFilter()` applies the owner KQL filter to the *cases* type. Since attachments are embedded, any authorized case comes with its attachments included. This is conceptually cleaner than the legacy approach where the authorization filter had to be applied separately to `case-comments`.

**How RBAC works with the separate SO approach:**

With separate `case-attachments` saved objects, each attachment document still needs its own `owner` field to support direct attachment queries. The `Authorization` class generates KQL filters like `case-attachments.attributes.owner: ("securitySolution")` that are applied at the ES level when querying attachments directly (e.g., find all alert attachments across cases, bulk-get attachments by ID).

This is more fields and more authorization checks, but it follows the established Kibana saved objects RBAC pattern and supports direct attachment queries without first loading the parent case. It also provides finer-grained audit logging — each attachment access is a distinct operation that the audit logger records independently, whereas with the embedded approach, all attachments are implicitly accessed whenever the case is read.

**Summary:** The embedded approach has a simpler RBAC model (case-level authorization only, no per-attachment owner). The separate SO approach has a more verbose but more standard RBAC model that supports direct attachment queries and finer-grained audit trails. Neither approach is clearly better here — the trade-off is simplicity vs. granularity.

---

## Comparison Matrix

| Dimension | Embedded (`dynamic:false`) | Separate `case-attachments` SO |
|-----------|---------------------------|-------------------------------|
| Read: single case + attachments | 1 ES read | 2+ ES reads (get + find) |
| Read: case list page | N reads (one per case) | N + N reads (cases + stats) |
| Write: add attachment | Read-modify-write full doc | Create independent doc + counter |
| Write contention | High (hot document) | Low (independent docs) |
| Consistency | Atomic | Eventually consistent (2-step) |
| Document size | Grows with attachments | Fixed small size per doc |
| ES Query DSL search | Only explicitly indexed fields, no field correlation | Full top-level query support |
| ES\|QL analytics | Only explicitly indexed fields | Fully viable |
| In-memory cost per request | O(all attachments) | O(page size) |
| Migration from legacy | Complex (reshape) | Simpler (rename/remap) |
| Max attachments per case | ~thousands (doc size) | ~millions (index size) |
| Import/export | One large NDJSON line | Many small NDJSON lines |
| RBAC model | Simpler — case-level authorization only, no per-attachment owner needed | Standard — per-attachment owner field, ES-level authorization filter |
| Audit granularity | Case-level; all attachments accessed implicitly on case read | Per-attachment; each access independently auditable |

---

## Suggested Solution: Hybrid Approach

**Use separate `case-attachments` saved objects as the primary store, but keep denormalized counters and a lightweight reference array on the case saved object.**

### What to Keep on the Case Saved Object (Already Present)

- **`total_comments`, `total_alerts`, `total_events`, `total_observables`:** Denormalized counters for fast case list rendering without querying attachments at all.
- **`attachments` field with only `id` and `type`** (current mapping, `dynamic: false`): Useful for quick existence checks and type-based filtering without a second query. Visible to ES|QL for basic analytics.

### What to Store in Separate `case-attachments` Saved Objects

- Full attachment data using the already-defined `case-attachments` type with its full field indexing.
- Link to the parent case via saved object references (standard Kibana pattern).
- Full-text search on `data.content`, date filtering on `created_at`, alert ID lookups: all handled natively by Elasticsearch at the shard level.
- **Independent pagination:** "page 3 of comments on case X" is a standard saved objects `find()` call with `page` and `perPage`.

### Counter Consistency

- Update counters on the case saved object when attachments are created or deleted.
- If counters drift (crash between steps), a background reconciliation task or on-read repair can fix them. This is the standard pattern used in distributed systems and is already partially implemented via the existing `computeStats()` method.
- The lightweight `attachments` array (`id` + `type` only) on the case SO can serve as the reconciliation source: compare its length/composition against actual `case-attachments` SOs to detect and repair drift.

### ES|QL Benefits Preserved

- Cross-case analytics become possible since each attachment is an independent indexed document with top-level fields.
- Example: "Find all cases that received alert attachments in the last 24 hours" becomes a straightforward ES|QL query.
- The lightweight attachments summary array on the case SO also remains visible to ES|QL.

### Migration Path

- New attachments go to the `case-attachments` saved object.
- Existing `case-comments` migrate 1:1 to `case-attachments` (simple field remapping).
- No complex document reshaping required.
- The lightweight attachments summary array on the case SO can be populated lazily or via a background migration.

### When Embedding Still Makes Sense

If the total number of attachments per case is **guaranteed to stay small** (say, fewer than 50), and write contention is not a concern, embedding is simpler. But given that `MAX_ALERTS_PER_CASE = 1,000` and real-world security cases can accumulate hundreds of comments, the separate saved object approach is safer for production scale.

---

## Summary

Embedding gives you transactional consistency and simpler reads at the cost of document bloat, write contention, loss of Elasticsearch-level queryability, limited ES|QL utility, and degraded RBAC enforcement.

**For a system where cases can accumulate 1,000+ attachments and multiple users and automations write concurrently, separate saved objects with denormalized counters is the more scalable and operationally safer architecture.**

The `case-attachments` saved object type already defined in the codebase is well-suited for this. Use it as the source of truth, and keep the lightweight `attachments` array on the case saved object as an optimization index rather than the canonical store. This preserves atomic-read benefits for the case list page, maintains ES|QL compatibility, enables Elasticsearch-native pagination and search on attachments, and provides a clean migration path from the legacy `case-comments` type.
