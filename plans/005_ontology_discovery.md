# 005 — Ontology discovery: a semantic layer for AI index sources

A new knowledge item (KI) generation workflow for Context Engine AI indices. Dreaming builds facts
and entities from what agents and users said. Ontology discovery builds them from the data the AI
index points at: the indices and data streams behind its ES|QL sources, and the ES|QL queries agents
actually ran against them.

The idea comes from [NVIDIA Auto Ontology](https://github.com/NVIDIA/auto-ontology) (Apache 2.0).
It compiles database metadata, value profiles and query history into an ontology of **terms**
(business concepts with synonyms, mapped to columns), **SQL attributes** (reviewed expressions under
a term) and **relationships** (joins confirmed by the data). People certify the draft, and agents
use it to write grounded queries. We borrow the approach, not the code: it is Python on Postgres and
SQL, and we already have most of the pieces in Context Engine.

Written against `upstream/main` at `55eadab0c1e7` (Nov 18, 2026).

## Why

Agents that answer questions from an AI index's sources today get two things: the
`describeAiIndex` context block (which describes the AI index's own backing index, not its
sources) and whatever access patterns dreaming happened to see in memories. Dreaming is told to
build access patterns "only from indices, fields, values and queries that appear in the MEMORIES",
so a new AI index, or a source nobody has discussed yet, has none. The agent then guesses index
names, field names and filter values, and the ES|QL verifiers can only tell it afterwards that the
query was wrong.

Ontology discovery gives every source a described, verified starting point before the first
conversation, and keeps it current as mappings and usage change.

## How Auto Ontology maps onto Context Engine

| Auto Ontology | Context Engine today | This plan |
| --- | --- | --- |
| Catalog ingest (tables, columns, keys) | ES\|QL sources on the AI index; `field_caps` | `catalogOntologySources` step |
| Value profiling with SQL | nothing | ES\|QL `STATS` profile in the same step |
| Term (concept, synonyms, columns) | `entity.*` KIs, user-configured types | `ontology.term` KI |
| Table | nothing | `ontology.dataset` KI |
| SQL attribute | `access_patterns` on entities and facts | access patterns on datasets and terms |
| Static and model checks on SQL | ES\|QL syntax and runtime verifiers (`keepVerifiedPatterns`) | same verifiers |
| Join kept only when the data confirms it | nothing | `verifyOntologyJoins` step (value overlap) |
| Relationships | `memory.relationship` KIs | same KI type, built-in ontology relations |
| Query history | trace rounds (`trace_rounds.ts` already reads the `FROM` sources of ES\|QL) | `readOntologyQueryHistory` step |
| Certify | `governance.lifecycle.status` (`active`, `deleted`, `verification_failed`) | `ontology.status` attribute: `draft` or `certified` |
| Learn from corrections | `feedback_analysis` | certified items are never overwritten (Story 8) |

## Design

### What gets built

**`ontology.dataset`**: one KI per concrete index, data stream or alias resolved from the `FROM` of
an ES|QL source.

- `title`: the dataset name, such as `logs-nginx.access-default` or `orders`.
- `description`: one sentence on what a row is.
- `content`: what the dataset holds, its time field and range, the notable fields with their types
  and what they mean, and the rendered access patterns (the same `## Access patterns` section
  `renderContent` already writes).
- `attributes`:
  - `ontology.status`: `draft` or `certified`.
  - `ontology.index`: the concrete index expression the KI describes.
  - `ontology.fingerprint`: a hash of the sorted field names and types, so an unchanged mapping is
    not profiled or re-described again.
  - `ontology.profiled_at`: when the values were last profiled.
  - `ontology.time_field`, `ontology.row_count`.
  - `access_patterns` and `esql`: as dreaming writes them, so the ES|QL verifiers check them.
- `references`: `derived_from` the ES|QL source (`source://esql/<n>`, see Decisions) and, for
  patterns taken from query history, the trace rounds (`trace://<id>`).

**`ontology.term`**: a business concept such as *Customer*, *Order* or *Error rate*.

- `title`, `description`.
- `attributes`:
  - `ontology.status`.
  - `ontology.synonyms`: other names for it, such as `client`, `account`.
  - `ontology.fields`: where it is stored, as `<dataset>:<field>`, such as `orders:customer_id`.
  - `access_patterns` and `esql`: the term's measures and lookups, the equivalent of Auto
    Ontology's SQL attributes. For example *Revenue* gets
    `FROM orders | WHERE @timestamp >= ?from AND @timestamp < ?to | STATS revenue = SUM(taxful_total_price)`.

**Relationships**, stored as `memory.relationship` KIs with the existing key and id scheme
(`relationshipKey`, `relationshipId`), so the KI relationships API and graph see them:

- `stored_in`: from a term to a dataset that holds it. Its description names the fields.
- `joins_with`: from a dataset to another, with attributes `ontology.from_field` and
  `ontology.to_field`. Only written after `verifyOntologyJoins` confirms it. Its description says
  how to join in ES|QL: `LOOKUP JOIN` when the other side is a lookup-mode index, otherwise
  `ENRICH` or two queries.

These are built-in relation types; they do not come from the dreaming config.

### Workflow: `system-context-engine-ontology-<suffix>`

```text
status          getDreamingStatus source: ontology
last_run        workflow.getLastRun
catalog         context-engine.catalogOntologySources        (no model)
  resolve each ES|QL source's FROM to concrete datasets (cap 50)
  field_caps per dataset (cap 500 fields)
  fingerprint; skip datasets unchanged and profiled within the refresh window
  ES|QL profile of the changed ones: count, time range,
    keyword: count_distinct, top 5 values when cardinality <= 100 and value samples are on
    numeric: min, max, avg
  existing ontology KIs (latest revision, not deleted)
history         context-engine.readOntologyQueryHistory      (no model, only with trace sources)
  ES|QL queries from trace rounds since the last run, grouped by dataset,
  normalized and deduplicated, cap 20 per dataset
datasets        foreach changed dataset
  describe      ai.prompt: description, content, terms with synonyms and fields,
                access patterns, candidate join keys
  apply         context-engine.applyOntologyChanges           (verifies access patterns)
joins           context-engine.verifyOntologyJoins           (no model)
  for each candidate pair of compatible fields: sample up to 1000 distinct values
  on one side, count how many exist on the other, keep the pair at >= 50% overlap
terms           ai.prompt: merge terms across datasets into term families
                (Customer in orders and in customers is one term with two fields)
apply_terms     context-engine.applyOntologyChanges           (terms, stored_in, joins_with)
output          created, updated, deleted, rejected, dropped_access_patterns, datasets, skipped
```

Every step that calls a model gets bounded input: one dataset per prompt, top values only for
low-cardinality fields, a capped field list, capped query history.

### Config

A new optional block on the existing dreaming config, saved through the existing internal dreaming
route:

```ts
interface AiIndexOntologyConfig {
  /** Whether ontology discovery runs on the dreaming schedule. */
  enabled: boolean;
  /** Profile top values of low-cardinality keyword fields. Off: names and types only. */
  value_samples?: boolean; // default true
  /** Read ES|QL queries agents ran from the AI index's trace sources. */
  query_history?: boolean; // default true
  /** Re-profile an unchanged dataset after this long. */
  refresh_interval?: string; // default '7d'
}

interface AiIndexDreamingConfig {
  // ...existing fields
  ontology?: AiIndexOntologyConfig | null;
}
```

It runs on the dreaming schedule and uses the dreaming connector and instructions. Today
`shouldDream` requires at least one fact or entity type; ontology discovery must install without
them.

### Safety

- **Read-only on sources.** The workflow only calls `field_caps`, ES|QL `FROM ... | STATS` and
  `LIMIT`ed reads, as the user who saved the config (the same identity dreaming runs as). It never
  writes outside the AI index.
- **Value samples leave the source's access control.** A top value of a source field becomes text
  in a KI that every reader of the AI index can see, even one who cannot read the source.
  `value_samples` defaults on but is a single switch, the profile skips fields that look sensitive
  (names matching `password`, `token`, `secret`, `email`, `ip`, `user.name` and the like), and the
  docs say so. See Open questions.
- **Bounded everything.** Caps on datasets, fields, profiled fields, top values, query history,
  join candidates, terms and access patterns per item, all as constants next to the existing
  dreaming ones. New route schema fields use bounded strings and arrays.
- **Only verified queries.** An access pattern whose example does not pass the ES|QL syntax and
  runtime verifiers is dropped, as in dreaming. A join is written only when the data confirms it.
- **Certified items are not overwritten.** See Story 8.

## Decisions

- **A separate `ontology.` prefix, not `entity.*`.** `entity.*` types come from the user's dreaming
  config and are validated against it in `resolve_change_set.ts`. A fixed `ontology.dataset` and
  `ontology.term` keeps the two apart, so a user's `entity.customer` (a person they talked about)
  is not mixed up with the `Customer` term (a concept stored in `orders:customer_id`). The
  relationships workflow and `resolve_relationships.ts` only handle `fact.*` and `entity.*`, which
  is fine: linking facts and entities to ontology terms is a follow-up (Story 10).
- **A new apply step instead of extending `applyDreamChanges`.** Dreaming's apply step requires
  every item to cite memories and checks types against the config. Ontology items cite sources and
  traces and have fixed types. The new step reuses `ids.ts`, `permissions.ts`, `access_patterns.ts`
  and the KI write path, but has its own validation.
- **Deterministic ids.** `ontology-dataset--<slug>` and `ontology-term--<slug>` via `slugify`, so a
  rerun updates an item instead of duplicating it.
- **Permissions: visible in the AI index's space.** The KIs describe sources, not a user's memories,
  so they are not split by audience. They are restricted to the space the workflow runs in.
- **Certification as an attribute, not a lifecycle status.** Adding `draft` to
  `KI_LIFECYCLE_STATUSES` would touch every reader that treats unknown statuses as active. An
  `ontology.status` attribute is local to this feature and can be promoted later.
- **Source URIs.** ES|QL sources have no id today, only a position and a value. References use
  `source://esql/<sha of the query>`, so they stay stable when the source list is reordered.
- **ES|QL sources only in v1.** Connector sources have no schema to read in a uniform way. Plan 004's
  research module could cover them later.

## Stories

### Story 1: Config model, validation and route schema
**Status**: ⏳ TODO

- `common/dreaming.ts`: `AiIndexOntologyConfig`, `ontology` on `AiIndexDreamingConfig`, constants
  (`DEFAULT_ONTOLOGY_REFRESH_INTERVAL`, caps), `ontologyEnabled(config)`.
- `server/routes/schemas/dreaming_schema.ts`: bounded schema for the block.
- `dreamingBuildsAnything` and `shouldDream`: true when ontology is on, even with no fact or entity
  types.
- Unit tests for defaults, validation and `shouldDream`.

### Story 2: `context-engine.catalogOntologySources` step
**Status**: ⏳ TODO

- Common definition (input, output schemas with bounds) and server implementation.
- Parse each ES|QL source's `FROM` with `@kbn/esql-language`, as `trace_rounds.ts` does; resolve
  patterns with the resolve index API; cap at 50 datasets.
- `field_caps` per dataset; fingerprint; compare with the existing `ontology.dataset` KIs and the
  refresh window.
- ES|QL profile queries built in TypeScript, not by the model; skip sensitive-looking fields; honor
  `value_samples`.
- Return the datasets to describe, the ones skipped and why, and the existing ontology KIs.
- Unit tests with a mocked ES client: resolution, caps, fingerprint skip, profile query shape,
  sensitive-field skip, a failing source not stopping the others.

### Story 3: `context-engine.readOntologyQueryHistory` step
**Status**: ⏳ TODO

- Read trace rounds since the cursor (reuse `trace_rounds.ts`), pull ES|QL tool calls and their
  queries, keep the ones whose `FROM` names a cataloged dataset, normalize (strip literals into
  `?params`), deduplicate, cap per dataset, keep the round ids for references.
- Unit tests: grouping, normalization, dedupe, caps, no trace sources.

### Story 4: `context-engine.applyOntologyChanges` step
**Status**: ⏳ TODO

- Change set schema for datasets, terms and relationships (`stored_in`, `joins_with`), with refs
  like dreaming (`new:1` or an existing id).
- Validation: fixed types, every dataset maps to a cataloged one, `ontology.fields` name cataloged
  fields, relationship ends exist, `joins_with` only when it is in the verified join list.
- Deterministic ids, space-restricted permissions, references to sources and trace rounds.
- Access patterns verified with `createVerifyEsql` and `keepVerifiedPatterns`.
- Certified items: reject changes to them (reason `certified`), still allow new relationships to
  them.
- Dry run that reports what it would write, as `applyDreamChanges` does.
- Unit tests for each rule, id stability, permissions, dry run.

### Story 5: `context-engine.verifyOntologyJoins` step
**Status**: ⏳ TODO

- Input: candidate pairs from the describe prompts. Drop pairs with incompatible field types.
- For each pair: `FROM a | STATS BY field | LIMIT 1000`, then a `terms` count on the other side;
  keep pairs at or above the overlap threshold; cap candidates per run.
- Output: the verified pairs with their overlap, and the rejected ones with why.
- Unit tests: overlap math, type filter, caps, empty sides.

### Story 6: Managed workflow `ontology.yaml` and definition
**Status**: ⏳ TODO

- `src/platform/packages/shared/kbn-workflows/managed/definitions/context_engine/ontology.yaml`
  with the steps above and the two prompts.
- `CONTEXT_ENGINE_ONTOLOGY_WORKFLOW` in `index.ts`, template values reusing
  `ContextEngineDreamingWorkflowTemplateValues` plus the ontology config.
- `getDreamingStatus`: new `ontology` source; `dream: false` when ontology is off or the AI index
  has no ES|QL sources.
- `ontology.test.ts` in the style of `relationships.test.ts`: step order, prompt contents, the
  `foreach` input, outputs. `managed_workflow_definitions.test.ts` updated.

### Story 7: Scheduling and change handling
**Status**: ⏳ TODO

- `server/dreaming/schedule.ts`: add the ontology workflow to `DREAMING_WORKFLOWS`, installed only
  when ontology is on (the list is unconditional today, so it needs a per-workflow condition).
- `isDreamingAutomation`: the new id prefix.
- `change_handler.ts`: also react to `sources`, so adding a source reconciles the workflow.
- Unit tests for install, uninstall and toggling.

### Story 8: Certification and agent read path
**Status**: ⏳ TODO

- Internal route to set `ontology.status` on an ontology KI (`draft` or `certified`), with the same
  authorization as the dreaming config route.
- `describeAiIndex`: a `Datasets` section listing certified items first, then drafts, each with
  its description and one example access pattern, capped.
- Unit tests; Scout API test for the route.

### Story 9: Settings UI
**Status**: ⏳ TODO

- An "Ontology discovery" section in the AI index dreaming settings: the switch, value samples,
  query history, refresh interval, with the value-samples warning.
- A draft or certified badge and a certify action in the KI list for `ontology.*` items.
- i18n with `@kbn/i18n`; RTL tests.

### Story 10: Evaluation and follow-ups
**Status**: ⏳ TODO

- Eval on Kibana sample data (eCommerce, flights, web logs): a fixed question set answered by an
  agent with and without the ontology, scored on correct ES|QL and correct answer, in the style of
  the dreaming eval and `auto-ontology-eval`.
- Follow-ups, not in this plan: let the relationships workflow link `fact.*` and `entity.*` to
  `ontology.term` (matching on synonyms as well as titles); connector sources; import and export
  as [Apache Ossie](https://nvidia.github.io/auto-ontology/) YAML; let dreaming propose the
  dreaming config itself (fact, entity and relationship types) from sample memories.

### Story 11: Quality
**Status**: ⏳ TODO

- `node scripts/type_check --project` for `kbn-workflows` and `context_engine`.
- `node scripts/eslint` on changed files, `node scripts/i18n_check --fix`.
- Jest for every new step, YAML and route; Scout API test for the route.

## Open questions

1. **Value samples and access control.** Is a single `value_samples` switch plus a sensitive-name
   skip list enough, or should value samples be off by default?
2. **Where the KIs live.** In the AI index's backing index with the other KIs (this plan), or in a
   separate index so they can have their own retention and access?
3. **Certification UX.** Is an attribute and a badge enough for v1, or should certification reuse
   the improvements review flow?
4. **Join threshold.** 50% overlap of up to 1000 sampled values is a guess; the eval should tune it.
