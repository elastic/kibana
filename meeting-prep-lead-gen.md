# Lead Generation: Meeting Preparation

## Context

Mark raised [PR #262547](https://github.com/elastic/kibana/pull/262547) to fix the LLM wiring gap and several other issues. His message on the group:

> "I got lead generation working with connectors... My assessment is that for 9.4 we could get something working but there are some areas I would like to improve, we need to prioritise the entities and the leads we send to the LLM better (or maybe the observation modules already do this I havent looked into it) and I think the leads themselves could be richer. Lets keep talking on Monday."

This document covers what happened, what I've done since, what I've found, and concrete proposals for the areas Mark flagged.

---

## 1. Why the LLM Wiring Was Missed

The root cause is a classic integration blind spot that comes from building resilient systems. The pipeline was designed to degrade gracefully — if an LLM connector isn't available, it falls back to rule-based synthesis and keeps producing valid leads. That's the right design for a phased rollout. But the same resilience that makes the system robust in production is what made this gap invisible during development: the fallback worked so well that the pipeline appeared fully functional even though the LLM path was never being invoked. There were no errors, no crashes, no malformed output — just quietly downgraded results that still looked reasonable.

### How the architecture was designed

The pipeline was intentionally built in phases. Phases 1-2 (observation modules, scoring engine, persistence) were pure algorithmic — no LLM dependency. The LLM was always planned as a Phase 3+ addition that would enhance the output, not gate it. To support this phased rollout, the `chatModel` parameter was made **optional** at every layer:

- `generateLeads(entities, { chatModel? })` in the engine
- `runLeadGenerationPipeline({ chatModel? })` in the pipeline
- `groupIntoLeads(entities, config, logger, chatModel?)` in synthesis

When `chatModel` is `undefined`, the pipeline falls back to rule-based synthesis — producing structurally valid leads with titles, descriptions, and tags derived from observation data. This fallback exists by design so the feature works without a connector configured.

### What went wrong

I implemented `llmSynthesizeBatch` correctly and wired the conditional branching in the engine (`if chatModel → LLM path, else → rule-based`). But I did not complete the last mile: resolving `chatModel` from the inference service at the route handler and passing it down through `runLeadGenerationPipeline`. The call sites in `run_pipeline.ts` and the route handler simply never provided the argument.

Because the parameter was optional with a working fallback, this produced **no compile error, no runtime error, and no test failure**. The pipeline ran successfully every time — it just silently used the rule-based path. The leads looked reasonable, the API returned valid data, and the tests passed because they were testing the algorithmic pipeline (which was the active scope at the time).

### What I should have done differently

1. **End-to-end integration test for the LLM path specifically.** The existing tests validated the algorithmic pipeline, but there was no test asserting that `llmSynthesizeBatch` was actually called when a connector was available. I've since written these tests (Section 2 below).

2. **A loud log line or metric when falling back to rule-based synthesis.** The fallback was silent. A `logger.warn('LLM chatModel not provided — using rule-based synthesis fallback')` at the decision point would have surfaced the issue during any manual testing with a configured connector.

3. **Traced the data flow end-to-end from the route handler down.** I focused on the engine internals and the synthesis function in isolation, but didn't verify the full call chain from HTTP request → route handler → pipeline → engine → synthesis with a real connector resolution.

### What I've done to prevent this class of issue

- Written 17 tests covering the LLM wiring, the engine dispatch, fallback behavior, and the synthesis function itself (details in Section 2)
- Identified the `getCriticalityRank` bug through the same end-to-end tracing discipline (Section 3)
- Designed a signal-presence pre-filter that improves entity prioritization before modules run (Section 4)

The lesson is clear: optional parameters with silent fallbacks need explicit test coverage for both paths, and the fallback path should never be silent in logs.

---

## 2. What I've Done: Test Coverage for LLM Integration

After Mark's PR, I reviewed every line and wrote targeted tests to make sure the LLM integration path is properly validated going forward. These are local on branch `ea-lead-gen-llm-integration-tests`, ready for discussion before pushing.

### Tests added to `run_pipeline.test.ts`

| Test | What it validates |
|---|---|
| `passes chatModel to engine.generateLeads when provided` | `chatModel` object flows from `runLeadGenerationPipeline` into the engine |
| `passes undefined chatModel when none is provided` | Rule-based fallback is the default when no connector is configured |

### Tests added to `lead_generation_engine.test.ts`

| Test | What it validates |
|---|---|
| `calls llmSynthesizeBatch when chatModel is provided` | Engine dispatches to LLM path with correct arguments |
| `does NOT call llmSynthesizeBatch when chatModel is omitted` | Rule-based fallback is used when no chatModel |
| `falls back to rule-based synthesis when LLM batch call throws` | Graceful degradation: LLM failure does not crash the pipeline |
| `uses LLM results for all leads in a multi-entity batch` | Batch call processes multiple entities correctly |

### New file: `llm_synthesize.test.ts` (11 tests)

Comprehensive unit tests for the `llmSynthesizeBatch` function itself:

- Empty groups, wrong item count, non-array response
- Missing/malformed fields (title, tags)
- Title truncation (>5 words)
- Markdown stripping from descriptions
- MITRE ATT&CK ID filtering from tags
- Tag cap (6) and recommendation cap (5)
- Multi-lead batch order preservation
- Non-string tag coercion

---

## 3. Bug Found: `getCriticalityRank` Reads Wrong Path

**File**: `entity_conversion.ts`, line 29-33

**The bug**: `getCriticalityRank` navigates `entity.record.entity.asset.criticality` — treating `asset` as nested inside `entity`. But in the Entity Store V2 schema, `entity` and `asset` are **sibling fields** at the record root.

**Proof from the Zod schema** (`common.gen.ts`, UserEntity definition):

```
UserEntity = z.object({
  '@timestamp': ...,
  entity: EntityField,     // <-- entity is here
  user: ...,
  asset: Asset.optional(), // <-- asset is HERE, sibling to entity
  event: ...,
})
```

**Current (broken)**:
```typescript
const entityField = r.entity as Record<string, unknown> | undefined;
const asset = entityField?.asset as { criticality?: string } | undefined;
// Always undefined -> rank always 0 -> sort is a no-op
```

**Fix**:
```typescript
const asset = r.asset as { criticality?: string } | undefined;
// Reads from the correct sibling path
```

**Impact**: `sortEntitiesByCriticality` is currently a no-op — every entity gets rank 0, so the sort preserves the original order. Critical/high-impact entities are NOT being processed first.

**Also confirmed by**: Macroscope bot comment on Mark's PR flagging this same path issue.

---

## 4. Proposal: Signal-Presence Pre-Filter

This directly addresses Mark's concern about "prioritising the entities we send to the LLM better."

### The Problem

Every entity from the Entity Store V2 flows into all three observation modules, even if it has zero signals. Each module makes ES queries (risk score time-series, alert aggregations, snapshot history) for all entities. Entities with no signal data will never produce observations and get dropped by the `minObservations` filter — but only after we've already paid the cost of querying for them.

### What's Available In-Memory (No Extra Queries)

These fields are already on the Entity Store V2 record at fetch time:

| Field | Path on record | Type |
|---|---|---|
| Risk score | `entity.risk.calculated_score_norm` | number |
| Risk level | `entity.risk.calculated_level` | `Critical` / `High` / `Moderate` / `Low` |
| Privileged | `entity.attributes.privileged` | boolean |
| Asset criticality | `asset.criticality` | `extreme_impact` / `high_impact` / `medium_impact` / `low_impact` |

### Filter Logic

An entity **passes** if ANY of these is true:
1. Risk level is Moderate, High, or Critical (not Low, not absent)
2. Is privileged (`entity.attributes.privileged === true`)
3. Has any asset criticality set (even `low_impact`)

An entity is **skipped** only when ALL three conditions are false.

### Why This Is Safe

- The risk engine ingests alert activity into risk scores, so entities with meaningful alerts almost always have a non-Low risk score
- Privileged entities are always interesting regardless of current risk
- Asset criticality is an admin designation — if set, it was intentional
- The edge case (entity with ONLY critical alerts, zero risk, no privilege, no criticality) is rare in practice

### Where It Sits in the Pipeline

```
1. fetchAllLeadEntities()         -- paginate Entity Store V2
2. sortEntitiesByCriticality()    -- sort by admin-assigned criticality
3. filterBySignalPresence()       -- NEW: skip zero-signal entities
4. engine.generateLeads()         -- run modules, score, synthesize
```

Function lives in `entity_conversion.ts` alongside `sortEntitiesByCriticality`. Called from `run_pipeline.ts`.

### Decision Points for Mark

- **Conservative (recommended for now)**: In-memory only, no extra queries. Accept the rare alert-only edge case.
- **Two-pass (future)**: Add a lightweight alert `_count` query before the filter to also catch alert-only entities. More complete but adds a query.
- **Should Low risk entities pass?** Currently they'd be skipped. But "Low" means the risk engine DID score them. Could argue either way.
- **Configurable?** `skipLowSignalEntities: boolean` in engine config, defaulting to `true`.

---

## 5. Observation Modules: They Already Prioritize (Mark's Question)

Mark asked: "we need to prioritise the entities and the leads we send to the LLM better (or maybe the observation modules already do this I havent looked into it)"

**Answer: Partially yes, partially no.**

### What the modules already do well

**Risk Analysis Module** (weight: 0.35, priority: 10):
- Skips entities with no risk data (`extractEntityInternals` returns `undefined`)
- Skips "Low" risk level entities entirely — intentional, not a bug
- Detects risk escalations across 3 time windows (24h, 7d, 90d) with tiered severity
- Flags privileged + high-risk as critical

**Temporal State Module** (weight: 0.25, priority: 9):
- Pre-filters to only privileged entities before querying ES
- Only queries history for entities that are currently privileged

**Behavioral Analysis Module** (weight: 0.30, priority: 8):
- Filters to supported entity types before querying
- Mark's fix capped `ENTITY_BUCKET_LIMIT` at 500 to prevent unbounded aggregation
- Produces tiered observations: severity, volume spikes, multi-tactic patterns

### What's missing (improvements to propose)

1. **The `getCriticalityRank` bug** (Section 3 above) — criticality sort is a no-op
2. **No signal-presence pre-filter** (Section 4 above) — zero-signal entities still trigger module queries
3. **No entity cap before modules** — if we have 10,000 entities, all 10,000 flow through all modules. The `maxLeads: 10` cap only applies AFTER scoring. A hard cap (e.g., top 500 after sort + filter) would bound module query costs.

---

## 6. Scoring Engine: How It Works

For Mark's reference if he hasn't looked at it yet.

### Formula

```
contribution_per_observation = module_weight * observation.score * observation.confidence

raw_score = sum(all contributions)
          * (1 + corroborationBonus)  -- if multiple obs from same module
          * (1 + diversityBonus)      -- if obs from multiple modules

priority = round(raw_score / normalizationCeiling * 9 + 1), clamped [1, 10]
```

### Defaults

| Parameter | Value |
|---|---|
| `minObservations` | 1 |
| `maxLeads` | 10 |
| `corroborationBonus` | 0.15 |
| `diversityBonus` | 0.10 |
| `normalizationCeiling` | 100 |

### Module Weights

| Module | Weight |
|---|---|
| Risk Analysis | 0.35 |
| Behavioral Analysis | 0.30 |
| Temporal State | 0.25 |

This means a critical risk score observation (score=100, confidence=0.95) contributes `0.35 * 100 * 0.95 = 33.25` to raw score. A critical alert observation contributes `0.30 * 100 * 0.95 = 28.5`. The bonuses reward entities that have signals from multiple modules (diversity) or multiple signals from the same module (corroboration).

---

## 7. What I'd Propose to Work on Next (For Discussion)

| Item | Effort | Impact | Dependencies |
|---|---|---|---|
| Fix `getCriticalityRank` bug | Small (1 line + tests) | High — unlocks entity prioritization | None |
| Signal-presence pre-filter | Small-medium (new function + tests) | Medium — reduces wasted ES queries | `getCriticalityRank` fix |
| Entity cap before modules | Small (add `.slice(0, N)` after filter) | Medium — bounds query cost at scale | Pre-filter |
| Connector selector UX | Medium | High — Mark mentioned this as quick win | Mark's PR merged |
| Richer leads (LLM prompt improvements) | Medium | High — Mark's feedback on lead quality | Mark's PR merged |

---

## 8. Key Files Reference

| File | Purpose |
|---|---|
| `entity_conversion.ts` | Entity prioritization, `getCriticalityRank` (buggy), `sortEntitiesByCriticality` |
| `run_pipeline.ts` | Shared pipeline: fetch -> sort -> engine -> persist |
| `engine/lead_generation_engine.ts` | Core engine: collect observations -> score -> group -> synthesize |
| `engine/llm_synthesize.ts` | LangChain prompt + JSON parsing for LLM synthesis |
| `observation_modules/risk_score_module.ts` | Risk level, escalation, privileged+high-risk observations |
| `observation_modules/temporal_state_module.ts` | Privilege escalation detection from history snapshots |
| `observation_modules/behavioral_analysis_module/` | Alert severity, volume spikes, multi-tactic detection |
| `observation_modules/utils.ts` | Shared helpers: `getEntityField`, `extractIsPrivileged`, `entityToKey` |
| `common/.../entities/common.gen.ts` | Authoritative Zod schema proving `entity` and `asset` are siblings |
