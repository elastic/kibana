# SIEM Readiness — ES|QL Reference for Agent Skill

> **Purpose:** Replicate the data fetched by each SIEM Readiness UI tab using ES|QL (where possible)
> and document which sections require direct Elasticsearch/Kibana API calls.
> Intended for use in an agent skill that answers SIEM readiness status questions with full
> alignment to what the UI displays.

---

## Categories Map

All tabs group indices and data by these 5 main categories.  
Source: [`get_readiness_categories.ts`](../x-pack/solutions/security/plugins/security_solution/server/lib/siem_readiness/routes/get_readiness_categories.ts)

| Main Category | ECS `event.category` values |
|---|---|
| **Endpoint** | `endpoint`, `file`, `process`, `registry`, `malware`, `driver`, `host`, `vulnerability` |
| **Identity** | `authentication`, `iam`, `session`, `user` |
| **Network** | `network`, `firewall`, `intrusion_detection`, `dns` |
| **Cloud** | `cloud`, `configuration` |
| **Application/SaaS** | `application`, `web`, `database`, `package`, `api` |

This CASE expression is reused in every tab query below (referred to as `$CATEGORY_CASE`):

```esql
EVAL main_category = CASE(
  event.category IN ("endpoint","file","process","registry","malware","driver","host","vulnerability"), "Endpoint",
  event.category IN ("authentication","iam","session","user"), "Identity",
  event.category IN ("network","firewall","intrusion_detection","dns"), "Network",
  event.category IN ("cloud","configuration"), "Cloud",
  event.category IN ("application","web","database","package","api"), "Application/SaaS",
  null
)
```

---

## Coverage Tab

The Coverage tab has two distinct sections:
1. **Data coverage** — which event categories are actively flowing into Elastic
2. **Rule coverage** — which detection rules are covered by installed/enabled integrations

### 1.1 — Data Coverage: Active categories and indices

The server queries `event.category` across all indices and maps them to the 5 main categories.
This determines which categories are shown as "active" in the data coverage panel.

**Query — active categories (last 24 h):**

```esql
FROM logs-*,metrics-*
| WHERE @timestamp > NOW() - 1 day
| MV_EXPAND event.category
| WHERE event.category IN (
    "endpoint","file","process","registry","malware","driver","host","vulnerability",
    "authentication","iam","session","user",
    "network","firewall","intrusion_detection","dns",
    "cloud","configuration",
    "application","web","database","package","api"
  )
| EVAL main_category = CASE(
    event.category IN ("endpoint","file","process","registry","malware","driver","host","vulnerability"), "Endpoint",
    event.category IN ("authentication","iam","session","user"), "Identity",
    event.category IN ("network","firewall","intrusion_detection","dns"), "Network",
    event.category IN ("cloud","configuration"), "Cloud",
    event.category IN ("application","web","database","package","api"), "Application/SaaS",
    null
  )
| STATS doc_count = COUNT(*), last_seen = MAX(@timestamp) BY main_category, event.category
| SORT main_category ASC, doc_count DESC
```

**Expected outcome:**

| Column | Meaning |
|---|---|
| `main_category` | One of the 5 SIEM categories |
| `event.category` | The specific ECS sub-category flowing in |
| `doc_count` | Number of documents in the last 24 h |
| `last_seen` | Timestamp of the most recent document |

A `main_category` is "active" if at least one of its sub-categories has `doc_count > 0`.
Categories absent from the result have no data flowing in.

---

**Query — active indices per category (for cross-referencing with rules):**

```esql
FROM logs-*,metrics-*
| WHERE @timestamp > NOW() - 7 days
| MV_EXPAND event.category
| EVAL main_category = CASE(
    event.category IN ("endpoint","file","process","registry","malware","driver","host","vulnerability"), "Endpoint",
    event.category IN ("authentication","iam","session","user"), "Identity",
    event.category IN ("network","firewall","intrusion_detection","dns"), "Network",
    event.category IN ("cloud","configuration"), "Cloud",
    event.category IN ("application","web","database","package","api"), "Application/SaaS",
    null
  )
| WHERE main_category IS NOT NULL
| STATS doc_count = COUNT(*), last_seen = MAX(@timestamp) BY main_category, _index
| SORT main_category ASC, doc_count DESC
```

**Expected outcome:** One row per `(main_category, _index)` pair — which concrete indices belong to
each category based on the data they contain. This is the same set the UI shows as "active indices"
under each category card.

---

### 1.2 — Rule Coverage: Detection rules and integration status

**Not achievable with ES|QL.** Detection rules are stored as Kibana alerting saved objects.
`related_integrations` is a nested object field stored in `.kibana` system indices but is not
practically queryable via ES|QL at the rule granularity needed.

**Required APIs:**

```
GET /api/detection_engine/rules/_find?filter=alert.attributes.enabled:true&per_page=10000
GET /api/fleet/epm/packages?withPackagePoliciesCount=true
```

**Fields consumed from detection rules response:**

| Field | Usage |
|---|---|
| `related_integrations[].package` | Package name (e.g. `aws`, `crowdstrike`) |
| `related_integrations[].integration` | Sub-integration (optional, e.g. `cloudtrail`) |
| `threat[].tactic.name` | MITRE tactic name — see below |
| `enabled` | Only `true` rules are counted |

**Integration status logic (from Fleet response):**

```
enabled   = status === "installed" AND packagePoliciesInfo.count > 0
disabled  = status === "installed" AND packagePoliciesInfo.count === 0
missing   = status !== "installed"
```

**Rule coverage determination:**

A rule is "covered" if at least one of its `related_integrations[].package` values is in the
`enabled` set. Rules with no `related_integrations` are excluded from this section.

**Missing integrations** = packages referenced by rules but not in `installedSet`.

---

### 1.3 — MITRE ATT&CK Rules

**Same API, same rules set — no separate fetch.**
MITRE rules are not a distinct rule type; they are detection rules that have `threat[].tactic.name`
populated with a MITRE tactic. The UI filters the same rule response by this field.

**MITRE tactic names used as the filter:**

```
Initial Access, Defense Evasion, Privilege Escalation, Persistence,
Lateral Movement, Execution, Discovery, Collection, Exfiltration,
Impact, Resource Development, Credential Access, Command and Control,
Reconnaissance
```

A rule is counted as a "MITRE rule" if `threat` contains at least one element whose
`tactic.name` (lowercased, trimmed) matches any tactic in the list above.

The same coverage/missing-integration logic from §1.2 applies to MITRE rules.

---

## Quality Tab

The Quality tab shows ECS field-mapping compatibility results per index, grouped by category.
Results are stored in a dedicated data stream and must be computed (checked) before they can
be read. **The agent must trigger the check itself before reading results.**

---

### 2.0 — How the check works (important architecture note)

> **The ECS compatibility check is a client-side computation.** There is no single "run check"
> server endpoint. The UI (and therefore the agent) must:
> 1. Fetch raw index mappings and unallowed field values via two internal APIs
> 2. Compare them against the ECS spec in-process
> 3. Save the computed result via a third API
>
> Only after step 3 will the ES|QL read query (§2.3) return data for that index.

**Internal APIs involved (all `access: 'internal'`, version `1`):**

| Step | API | Method | Purpose |
|---|---|---|---|
| 1a | `/internal/ecs_data_quality_dashboard/mappings/{indexName}` | GET | Fetch index field mappings |
| 1b | `/internal/ecs_data_quality_dashboard/unallowed_field_values` | POST | Fetch buckets of invalid field values |
| 2 | — | — | Client computes compatibility against ECS spec (see below) |
| 3a | `/internal/ecs_data_quality_dashboard/stats/{indexName}` | GET | Fetch doc count + size in bytes |
| 3b | `/internal/ecs_data_quality_dashboard/results` | POST | Persist the computed result |

---

### 2.1 — Step 1: Fetch raw data per index

**Step 1a — Index mappings:**

```
GET /internal/ecs_data_quality_dashboard/mappings/{encodedIndexName}
Version: 1
```

Returns `Record<indexName, IndicesGetMappingIndexMappingRecord>` — the raw Elasticsearch
field mapping for every field in the index.

**Step 1b — Unallowed field values:**

```
POST /internal/ecs_data_quality_dashboard/unallowed_field_values
Version: 1
Body: UnallowedValueRequestItem[]
```

`UnallowedValueRequestItem` is a list of ECS fields that have a constrained `allowed_values`
list (e.g. `event.category`, `event.type`, `event.kind`). The server runs a terms aggregation
for each field on the target index and returns the actual values present.

The request items are derived from the ECS spec (`EcsFlatTyped`) — specifically all fields
where `allowed_values` is non-empty. The agent must build this list from the bundled ECS
spec or replicate the `getUnallowedValueRequestItems` logic.

---

### 2.2 — Step 2: Compute ECS compatibility (client-side logic)

The comparison against the ECS spec produces four buckets per index:

| Bucket | Definition |
|---|---|
| `ecsCompliant` | Fields present in mappings whose type exactly matches the ECS spec |
| `incompatible` | Fields whose type differs from ECS spec OR have values outside `allowed_values` |
| `sameFamily` | Fields with correct type family but wrong sub-type (e.g. `keyword` vs `constant_keyword`) |
| `custom` | Fields present in mappings that do not exist in the ECS spec at all |

`incompatibleFieldCount` = `incompatible.length` — this is the single metric the UI surfaces.

The ECS spec used for comparison is `EcsFlatTyped` from
`@kbn/ecs-data-quality-dashboard/impl/data_quality_panel/constants`. The agent skill will
need to embed or load this spec to replicate the comparison.

---

### 2.3 — Step 3: Fetch stats and save result

**Step 3a — Index stats:**

```
GET /internal/ecs_data_quality_dashboard/stats/{encodedIndexName}?isILMAvailable=true
Version: 1
```

Serverless: add `isILMAvailable=false&startDate=<30daysAgo>&endDate=<now>` (uses metering
stats path instead of `/_stats`).

Returns `{ [indexName]: { num_docs: number, size_in_bytes: number } }`.

**Step 3b — Save result:**

```
POST /internal/ecs_data_quality_dashboard/results
Version: 1
Body: ResultDocument
```

Full `ResultDocument` shape (all fields required unless marked optional):

```typescript
{
  batchId: string,            // uuid — group multiple index checks in one run
  indexName: string,
  indexPattern?: string,      // same as indexName in siem_readiness
  isCheckAll: boolean,        // true when checking all indices at once
  checkedAt: number,          // Date.now() (Unix ms)
  docsCount: number,          // from stats response
  totalFieldCount: number,    // partitionedFieldMetadata.all.length
  ecsFieldCount: number,      // partitionedFieldMetadata.ecsCompliant.length
  customFieldCount: number,   // partitionedFieldMetadata.custom.length
  incompatibleFieldCount: number,
  incompatibleFieldMappingItems: Array<{ fieldName, expectedValue, actualValue, description }>,
  incompatibleFieldValueItems:  Array<{ fieldName, expectedValues, actualValues, description }>,
  sameFamilyFieldCount: number,
  sameFamilyFields: string[],
  sameFamilyFieldItems: Array<{ fieldName, expectedValue, actualValue, description }>,
  unallowedMappingFields: string[],   // fieldName from incompatibleFieldMappingItems
  unallowedValueFields: string[],     // fieldName from incompatibleFieldValueItems
  sizeInBytes: number,                // from stats response
  markdownComments: [],
  ecsVersion: string,                 // EcsVersion from @elastic/ecs
  error: string | null,
  ilmPhase?: string,
  checkedBy?: string,
  indexId?: string,
}
```

---

### 2.4 — Read results (ES|QL)

**Data stream name:** `.kibana-data-quality-dashboard-results`  
Backing indices are space-namespaced: `.kibana-data-quality-dashboard-results-{spaceId}`.
Use a wildcard to cover all spaces.

**Query — latest result per index:**

```esql
FROM .kibana-data-quality-dashboard-results*
| STATS
    incompatible_fields = MAX(incompatibleFieldCount),
    same_family_fields  = MAX(sameFamilyFieldCount),
    ecs_field_count     = MAX(ecsFieldCount),
    custom_field_count  = MAX(customFieldCount),
    total_field_count   = MAX(totalFieldCount),
    docs_count          = MAX(docsCount),
    size_in_bytes       = MAX(sizeInBytes),
    last_checked        = MAX(@timestamp)
  BY indexName
| EVAL status = CASE(incompatible_fields > 0, "incompatible", "healthy")
| SORT status ASC, incompatible_fields DESC
```

> `checkedAt` in the source document is a Unix epoch number (ms). Use `@timestamp` for
> date math in ES|QL since it is the canonical ECS timestamp field.

**Expected outcome per row:**

| Column | Meaning |
|---|---|
| `indexName` | The Elasticsearch index checked |
| `incompatible_fields` | ECS-incompatible field count (0 = fully compatible) |
| `same_family_fields` | Fields with correct type family but wrong sub-type |
| `ecs_field_count` | ECS-compliant mapped fields |
| `custom_field_count` | Custom (non-ECS) fields |
| `total_field_count` | Total mapped fields |
| `docs_count` | Document count at time of last check |
| `size_in_bytes` | Index size at time of last check |
| `last_checked` | Timestamp of the most recent check |
| `status` | `incompatible` if `incompatible_fields > 0`, else `healthy` |

**Category grouping:**
Cross-reference `indexName` against the index→category map from the data coverage query
(§1.1) or `GET /api/siem_readiness/get_categories`.

**Unchecked indices:** Any index from §1.1 absent from the results data stream has never been
checked. The agent must run steps 2.1–2.3 for those indices before reporting their status.

---

## Continuity Tab

The Continuity tab shows ingest pipeline health: how many docs were processed and the failure rate
per pipeline, grouped by the same 5 categories.

**Important:** Pipeline cumulative stats are in-memory on Elasticsearch ingest nodes and cannot be
queried via ES|QL. Two data sources are required:

| Data | Source |
|---|---|
| Docs processed + failed per pipeline | `GET /_nodes/stats/ingest` |
| Which pipeline is assigned to which index | `GET /logs-*,metrics-*/_settings?filter_path=*.settings.index.default_pipeline,*.settings.index.final_pipeline` |
| Which index belongs to which category | ES|QL query §1.1 OR `GET /api/siem_readiness/get_categories` |

---

### 3.1 — Docs ingested per index per category (ES|QL)

> **Important:** The UI shows every pipeline that is assigned to a SIEM-category index,
> **regardless** of whether that index has recent documents. The pipeline and index lists
> come from index settings (§3.2 source 2) and are the source of truth for what rows appear.
> ES|QL is used only to **enrich** those rows with a doc count. Indices with no recent docs
> still show up in the table with `doc_count = 0` — the agent must handle this by left-joining
> the ES|QL results onto the full pipeline/index list from the settings API.

**Query — doc count per index for the last 24 h:**

```esql
FROM logs-*,metrics-*
| WHERE @timestamp > NOW() - 1 day
| MV_EXPAND event.category
| EVAL main_category = CASE(
    event.category IN ("endpoint","file","process","registry","malware","driver","host","vulnerability"), "Endpoint",
    event.category IN ("authentication","iam","session","user"), "Identity",
    event.category IN ("network","firewall","intrusion_detection","dns"), "Network",
    event.category IN ("cloud","configuration"), "Cloud",
    event.category IN ("application","web","database","package","api"), "Application/SaaS",
    null
  )
| WHERE main_category IS NOT NULL
| STATS
    doc_count    = COUNT(*),
    last_ingest  = MAX(@timestamp),
    first_ingest = MIN(@timestamp)
  BY main_category, _index
| SORT main_category ASC, doc_count DESC
```

**Expected outcome per row:**

| Column | Meaning |
|---|---|
| `main_category` | One of the 5 categories |
| `_index` | The index (data stream backing index) |
| `doc_count` | Docs ingested in the last 24 h |
| `last_ingest` | Most recent document timestamp |
| `first_ingest` | Oldest document timestamp in the window |

Indices absent from these results have `doc_count = 0` and should still appear in the table
(sourced from the settings API pipeline list) with an empty/zero ingestion count.

---

### 3.2 — Pipeline failure rate (API required)

**Cannot be replicated with ES|QL.** Failed-document counts are runtime counters on each
Elasticsearch ingest node and are not stored in any index.

**API:** `GET /_nodes/stats/ingest`

**Response path:** `nodes.<nodeId>.ingest.pipelines.<pipelineName>.count` / `.failed`

**Aggregation logic (sum across all nodes):**

```
for each pipeline_name:
  total_count  = sum over nodes of nodes[n].ingest.pipelines[pipeline_name].count
  total_failed = sum over nodes of nodes[n].ingest.pipelines[pipeline_name].failed
  failure_rate = (total_failed / total_count) * 100   # 0 if total_count == 0
  status       = "critical" if failure_rate >= 1 else "healthy"
```

**Table columns the UI shows:**

| Column | Source |
|---|---|
| Pipeline name | Key from `nodes.stats` |
| Docs Ingested | `total_count` (cumulative since last node restart) |
| Failed Docs | `total_failed` |
| Failure Rate | `(total_failed / total_count) * 100` formatted to 1 decimal place |
| Status | Critical if ≥ 1%, healthy otherwise |

**Pipeline → category mapping:**

1. Fetch index settings for pipeline assignments (`default_pipeline` / `final_pipeline`)
2. For each pipeline, collect all its associated indices
3. Map each index to a category using the index→category map from §1.1
4. A pipeline may appear in multiple categories (one entry per category)

> **Note (serverless):** `nodes.stats` is unavailable in serverless. `statsAvailable` is `false`
> and the UI shows pipelines without stats columns.

---

## Retention Tab

The Retention tab shows whether each data stream or index is configured for ≥ 365 days retention
(FedRAMP compliance threshold), grouped by category.

**Not achievable with ES|QL.** Retention is a configuration property managed by ILM policies and
data stream lifecycle settings, not a queryable document field.

**Required APIs:**

| Data needed | API |
|---|---|
| All data streams + their lifecycle | `GET /_data_stream/*` |
| ILM policy definitions | `GET /_ilm/policy` |
| Standalone index lifecycle setting | `GET /*/_settings?filter_path=*.settings.index.lifecycle.name` |

---

### 4.1 — Retention determination logic

**For data streams** (from [`get_readiness_retention.ts`](../x-pack/solutions/security/plugins/security_solution/server/lib/siem_readiness/routes/get_readiness_retention.ts)):

```
dsl_enabled    = dataStream.lifecycle && lifecycle.enabled !== false
dsl_retention  = lifecycle.effective_retention ?? lifecycle.data_retention ?? null
ilm_policy     = dataStream.ilm_policy ?? null
prefer_ilm     = lifecycle.prefer_ilm ?? true   # defaults to true

if ilm_policy AND (prefer_ilm OR NOT dsl_retention):
  retention_type   = "ILM"
  retention_period = ilm_policies[ilm_policy].policy.phases.delete.min_age  (e.g. "365d")
elif dsl_retention:
  retention_type   = "DSL"
  retention_period = dsl_retention
else:
  retention_type   = "None"   # no limit — data kept forever
  retention_period = null
```

**For standalone indices** (non-data-stream):
Only ILM applies — read `settings.index.lifecycle.name` → look up that policy's delete phase.

**Compliance status:**

```
retention_days = parse retention_period to days (e.g. "365d" → 365, "12M" → ~365)
status = "non-compliant" if retention_days < 365
status = "healthy"       if retention_days >= 365 OR retention_period is null
# null = no delete configured = data kept indefinitely = compliant
```

**Table columns the UI shows:**

| Column | Source |
|---|---|
| Data stream / Index | Name from API response |
| Managed by | `"ILM"`, `"DSL"`, or `"None"` |
| Current retention | Retention string (e.g. `"365d"`) or `"Not configured"` |
| Status | `healthy` / `non-compliant` |

---

### 4.2 — Supplementary ES|QL: Actual data age span per index

This does **not** replace the API calls above, but serves as a sanity check — useful for
verifying that a configured retention policy is actually being enforced.

```esql
FROM logs-*,metrics-*
| STATS
    doc_count              = COUNT(*),
    oldest_doc             = MIN(@timestamp),
    newest_doc             = MAX(@timestamp)
  BY _index
| EVAL actual_data_span_days = DATE_DIFF("days", oldest_doc, newest_doc)
| SORT actual_data_span_days DESC
```

**Expected outcome per row:** `_index`, `doc_count`, `oldest_doc`, `newest_doc`,
`actual_data_span_days` — the effective span of data present in each index.

---

## Summary: ES|QL coverage vs. API required

| Tab | Section | Method | API call (if needed) |
|---|---|---|---|
| Coverage | Active data categories | ES\|QL | — |
| Coverage | Active indices per category | ES\|QL | — |
| Coverage | Detection rule coverage | API only | `GET /api/detection_engine/rules/_find` |
| Coverage | MITRE rule coverage | API only | Same rules API, filter by `threat.tactic.name` |
| Coverage | Integration install/enable status | API only | `GET /api/fleet/epm/packages` |
| Quality | Latest ECS compatibility result per index | ES\|QL | — |
| Quality | Index to category grouping | API + ES\|QL | `GET /api/siem_readiness/get_categories` |
| Continuity | Full index/pipeline list (rows source of truth) | API only | `GET /_nodes/stats/ingest` + `GET /<indices>/_settings` |
| Continuity | Doc count enrichment per index | ES\|QL | — (left-join onto API results) |
| Continuity | Pipeline failure rate | API only | `GET /_nodes/stats/ingest` |
| Retention | Retention config (ILM / DSL) | API only | `GET /_data_stream/*` + `GET /_ilm/policy` |
| Retention | Actual data age span (proxy check) | ES\|QL (approx.) | — |
