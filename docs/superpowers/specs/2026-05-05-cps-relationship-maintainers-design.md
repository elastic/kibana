# CPS Support for Entity Relationship Maintainers

**Date:** 2026-05-05
**Issue:** https://github.com/elastic/security-team/issues/17000
**Milestone:** 9.5
**Depends on:** https://github.com/elastic/kibana/issues/260198 (Entity Store extraction CPS)
**Target branch:** `maintainer-config-engine` (PR #266159 — config-driven generic engine)

---

## Context

### Central SOC model assumption

The Entity Store runs **only in the central project**. Linked (child) projects are log sources only — they ingest Okta, CloudTrail, Elastic Defend, and other integration events but do not run their own entity stores or maintainers. The central project's maintainers query logs from linked projects via CPS, then write all relationships back to the central entity store.

If this assumption changes (e.g. MSSP model where each child project runs its own entity store), the architecture described here would need to be revisited.

### What CPS means here

CPS (Cross-Project Search) is a serverless feature that allows an origin project to search across one or more linked projects. In the Central SOC model, integration logs are ingested into linked child projects. Without CPS support, the relationship maintainers (`accesses`, `communicates_with`) only see logs that were ingested locally, missing all data from linked projects.

### Current maintainer run loop (three steps)

The config-driven generic engine in PR #266159 runs each integration in three steps:

1. **Step 1 — Actor discovery** (`esClient.search`): Composite aggregation over the integration's index pattern to discover unique actor buckets within the lookback window.
2. **Step 2 — Target classification** (`esClient.esql.query`): ES|QL query scoped to the actors from Step 1 to count and classify relationship targets.
3. **Step 3 — Entity write** (`EntityUpdateClient`): Accumulated relationship records are written to the entity store's updates data stream.

Steps 1 and 2 are log reads. Step 3 is a local entity store write and must always use the local client.

### Two technical blockers

1. **Local-only ES client** — the engine currently receives a single `esClient` used for all three steps. Steps 1–2 need a CPS-enabled client to reach linked projects; Step 3 must stay local.

2. **ES|QL cross-project limitations** — unlike entity extraction (which uses LOOKUP JOIN, known to break CCS), the maintainers' Step 2 ES|QL is a plain `STATS` aggregation with no JOIN. It is not yet verified whether this works cross-project with `project_routing: 'space'`. This design assumes it may not and adopts the defensive two-step pattern.

### Entity store CPS client gap (open dependency)

> **Important:** The entity store does not yet have a solution for obtaining a CPS-enabled ES client. `CcsLogsExtractionClient` (the extraction equivalent of this feature) currently uses the same local `esClient` as the main extraction path — the actual remote-aware client construction is part of the still-open issue #260198. The design below leaves `cpsEsClient` as an injected parameter. Once #260198 establishes how to build the CPS client, the maintainer caller adopts the same pattern. This design may need to be updated when that solution lands.

---

## Chosen approach: dual-client injection, single run loop (Option 1)

Add an optional `cpsEsClient?: ElasticsearchClient` parameter to `runRelationshipMaintainer`. When present, the engine runs the existing integration loop **twice in sequence**:

1. **Local pass** — uses `esClient` against the integration's standard index pattern (current behavior, unchanged).
2. **Remote pass** — uses `cpsEsClient` against the same index patterns (CPS resolves them to linked-project indices). Produces additional `ProcessedEngineRecord[]` entries.

Both passes accumulate records before the single Step 3 entity write, which always uses the local `EntityUpdateClient`. When `cpsEsClient` is absent, the engine behaves exactly as today.

The caller is responsible for deciding whether a CPS client is available and passing it in. The engine is passive about client discovery.

### Why this approach

- Minimum new code to implement the defensive two-step.
- No new abstractions — the existing run loop, composite agg builder, ES|QL builder, and postprocessor are reused unchanged for both passes.
- Step 3 is naturally isolated — accumulation before a single write means local and remote records are merged and deduped at the entity store layer, which already handles concurrent writes.
- The caller injection point is the same pattern that #260198 will establish for entity extraction, so the two features converge on a consistent API.

### Data flow

```
runRelationshipMaintainer({ esClient, cpsEsClient?, ... })
  │
  ├─ [local pass]  esClient     → Step 1 (composite agg) → Step 2 (ES|QL) → records[]
  │
  ├─ [remote pass] cpsEsClient? → Step 1 (composite agg) → Step 2 (ES|QL) → records[]
  │                (skipped if cpsEsClient absent)
  │
  └─ [Step 3] EntityUpdateClient (always local) ← merged records[]
```

### Interface change

```ts
// engine/run_relationship_maintainer.ts
export async function runRelationshipMaintainer({
  esClient,
  cpsEsClient,   // NEW — optional; when present, remote pass runs after local pass
  logger,
  namespace,
  crudClient,
  configs,
  abortController,
}: {
  esClient: ElasticsearchClient;
  cpsEsClient?: ElasticsearchClient;  // NEW
  logger: Logger;
  namespace: string;
  crudClient: EntityUpdateClient;
  configs: RelationshipIntegrationConfig[];
  abortController?: AbortController;
})
```

### Implementation steps

1. Extract the existing per-integration loop body into a private `runPass(esClient, configs, ...)` helper that returns `ProcessedEngineRecord[]`.
2. Call `runPass(esClient, configs, ...)` for the local pass.
3. If `cpsEsClient` is defined and the run has not been aborted, call `runPass(cpsEsClient, configs, ...)` for the remote pass.
4. Merge both record arrays and pass them to Step 3 (`writeEntityIds`).
5. Update the callers (`accesses/index.ts`, `communicates_with/index.ts`) to accept and forward `cpsEsClient` from their task context once #260198 establishes how to obtain it.

### ES|QL cross-project verification (required before GA)

Before shipping, verify that the maintainers' Step 2 ES|QL (`STATS` aggregation, no LOOKUP JOIN) executes correctly when issued against a CPS-enabled client with `project_routing: 'space'`. The `SET unmapped_fields="nullify"` prefix used by the extraction ES|QL queries may also be needed here. If verification finds that plain ES|QL does not work cross-project, the remote pass in Step 2 will need to be replaced with the extraction-style pagination workaround (probe → slice → paginate), which is a larger change scoped to that discovery.

### Relationship target existence (blocked by #260198)

Even with CPS-enabled log reads, relationship targets written by the maintainers must already exist as entities in the entity store. A user accessed from a linked project's CloudTrail logs will produce `accesses host:X` — but `host:X` must exist as an entity. If entity extraction CPS (#260198) has not landed, these targets will be dangling references. **Maintainer CPS support should not be enabled in production until extraction CPS is confirmed working.**

---

## Alternatives considered

### Option 2 — Dedicated `CpsRelationshipMaintainer` class

Mirrors the `CcsLogsExtractionClient` architecture: a separate class wrapping the remote execution path, with its own saved-object checkpoint state for pagination recovery across failures.

**Why not chosen:** The extraction client needs checkpoint state because it paginates over a long time window that can fail mid-slice. The maintainer composite agg already provides a natural recovery point (the `after_key`), and the run loop is time-bounded by the existing `LOOKBACK_WINDOW`. The extra saved-object machinery adds complexity without a concrete benefit at this stage.

### Option 3 — Per-config `supportsCps` flag

Add `supportsCps?: boolean` to `RelationshipIntegrationConfig`. The engine reads `cpsEsClient` from params and runs an extra remote pass only for flagged configs.

**Why not chosen:** All configs would plausibly need CPS support in a Central SOC deployment. A per-config flag adds per-integration boilerplate for a concern that is really a per-run deployment decision (is this a CPS deployment?). The caller-injection approach in Option 1 handles this more cleanly at the call site.

---

## Out of scope

- MSSP entity collision (same user identifier across tenants): product has accepted this risk per issue #16856.
- Remote index pattern discovery: the caller resolves which remote index patterns to search. The engine receives them implicitly through the CPS-enabled client.
- Entity extraction CPS (#260198): a hard dependency, not designed here.
- UI or API surface changes.
