# CodeQL: Bound Unbounded String/Array Schema Validation

## Overview
GitHub Advanced Security (CodeQL) flagged ~214 alerts in `@elastic/contextual-security-apps` /
`@elastic/kibana-cloud-security-posture` / `@elastic/security-entity-analytics` owned files, all
from one rule family: `js/kibana/unbounded-string-in-schema` and `js/kibana/unbounded-array-in-schema`.
The fix is mechanical: add an explicit, justified upper bound to every unbounded string and array
in the flagged schemas. This is hardening — PRs are `backport:skip`, `release_note:skip`, no version label.

## Context
- **The fix per library:**
  - `@kbn/config-schema`: `schema.string()` → `schema.string({ maxLength: N })`; `schema.arrayOf(x)` → `schema.arrayOf(x, { maxSize: N })`. Bound the inner item too: `schema.arrayOf(schema.string({ maxLength: M }), { maxSize: N })`. Keep existing `minSize`, `schema.maybe`, defaults, and regex/validate.
  - `zod` (only the `agent_builder/.../inline_tools/` files): `z.string()` → `z.string().max(N)`; `z.array(x)` → `z.array(x).max(N)`.
- **Ceilings must be justified, not arbitrary.** Derive each from a real domain limit and add a one-line comment. Use **named `const` ceilings**, not inline magic numbers. Err generous when unsure — no legitimate existing payload may be rejected. Do NOT change the emitted `TypeOf<...>` types.
- **Reference implementation for the style:** `x-pack/solutions/security/packages/kbn-cloud-security-posture/common/schema/graph/v1.ts` — its array ceilings are already done and commented (e.g. `ESQL_MAX_RESULT_ROWS = 10_000`, `ESQL_DEFAULT_ROW_LIMIT = 1_000`, `INDEX_PATTERNS_MAX_SIZE = 100`). Reuse those names/rationale where the same limit applies.
- **Ceiling rationale cheatsheet:** UUID/entity/doc id → `256`; index pattern/name → `255`; namespace → `1024`; free-text search → `2048`; KQL/filter → `4096`; enum-like string (sort dir, status, type) → longest member (~`64`); generic label → `1024`; array of rows from one ES|QL query → `10_000`; array from a `LIMIT 1000` query → `1_000`; field/column lists → `50`–`100`.
- **Source issues (elastic/kibana-team):** 3648, 3561, 3488, 3483, 3477, 3054, 2893, 2762, 2664. Each body lists the precise `code-scanning/<id>` alert URLs; fixing every file listed for an issue resolves its alerts. After merge, tick the checkboxes / link the PR and flip each issue's label `triage_needed` → `triaged`.
- **Full handover doc:** `~/work/elastic/epics/codeql-schema-validation/handover/2026-06-29-codeql-unbounded-schema-validation.md`.
- All paths below are under `x-pack/solutions/security/`.

### Task 1: Bound kbn-cloud-security-posture shared schemas
- [x] In `packages/kbn-cloud-security-posture/common/schema/graph/v1.ts`, add `maxLength` to every remaining bare `schema.string()` (ids ~256, enum-like strings to longest member, timestamps/names as appropriate) — arrays are already bounded here
- [x] Bound all unbounded strings and arrays in `packages/kbn-cloud-security-posture/common/schema/graph_events/v1.ts`
- [x] Bound all unbounded strings and arrays in `packages/kbn-cloud-security-posture/common/schema/graph_entities/v1.ts`
- [x] Bound all unbounded strings and arrays in `packages/kbn-cloud-security-posture/common/schema/rules/v1.ts`, `rules/v2.ts`, `rules/v3.ts`, `rules/v4.ts`, `rules/v5.ts`
- [x] Add a justifying comment for each new ceiling; use named `const`s
- [x] Validate (targeted — fast): `node scripts/eslint --fix <changed files>` and `node scripts/type_check --project x-pack/solutions/security/packages/kbn-cloud-security-posture/tsconfig.json`. Run `node scripts/jest` on any co-located `*.test.ts` you touched. Fix all errors before marking done.

### Task 2: Bound cloud_security_posture plugin schemas
- [ ] Bound all unbounded strings/arrays in `plugins/cloud_security_posture/common/schemas/stats.ts`
- [ ] Bound all unbounded strings/arrays in `plugins/cloud_security_posture/common/types/benchmarks/v1.ts` and `benchmarks/v2.ts`
- [ ] Bound the route request schema in `plugins/cloud_security_posture/server/routes/detection_engine/get_detection_engine_alerts_count_by_rule_tags.ts`
- [ ] Add a justifying comment for each new ceiling; use named `const`s
- [ ] Validate (targeted — fast): `node scripts/eslint --fix <changed files>` and `node scripts/type_check --project x-pack/solutions/security/plugins/cloud_security_posture/tsconfig.json`. Run `node scripts/jest` on any co-located `*.test.ts` you touched. Fix all errors before marking done.

### Task 3: Bound session_view route schemas
- [ ] Bound the request schemas (params/query/body) in `plugins/session_view/server/routes/process_events_route.ts`, `io_events_route.ts`, `alerts_route.ts`, `get_total_io_bytes_route.ts`, `alert_status_route.ts`
- [ ] Add a justifying comment for each new ceiling; use named `const`s
- [ ] Validate (targeted — fast): `node scripts/eslint --fix <changed files>` and `node scripts/type_check --project x-pack/solutions/security/plugins/session_view/tsconfig.json`. Run `node scripts/jest` on any co-located `*.test.ts` you touched. Fix all errors before marking done.

### Task 4: Bound kubernetes_security routes and cloud_defend schema
- [ ] Bound the request schemas in `plugins/kubernetes_security/server/routes/multi_terms_aggregate.ts`, `aggregate.ts`, `count.ts`
- [ ] Bound all unbounded strings/arrays in `plugins/cloud_defend/common/schemas/v1.ts`
- [ ] Add a justifying comment for each new ceiling; use named `const`s
- [ ] Validate (targeted — fast): `node scripts/eslint --fix <changed files>`, `node scripts/type_check --project x-pack/solutions/security/plugins/kubernetes_security/tsconfig.json`, and `node scripts/type_check --project x-pack/solutions/security/plugins/cloud_defend/tsconfig.json`. Run `node scripts/jest` on any co-located `*.test.ts` you touched. Fix all errors before marking done.

### Task 5: Bound security_solution entity analytics schemas (config-schema + zod)
- [ ] Bound config-schema strings/arrays in `plugins/security_solution/server/lib/entity_analytics/entity_store/tasks/snapshot/state.ts`, `tasks/health/state.ts`, `tasks/field_retention_enrichment/state.ts`, `tasks/data_view_refresh/state.ts`
- [ ] Bound the config-schema request schema in `plugins/security_solution/server/lib/entity_analytics/entity_store/routes/entity_crud/upsert_entity.ts`
- [ ] Add `.max(N)` to every `z.string()` / `z.array()` in the zod tool schemas `plugins/security_solution/server/agent_builder/skills/entity_analytics/inline_tools/risk_score/risk_score.ts`, `inline_tools/asset_criticality/asset_criticality.ts`, `inline_tools/common.ts`
- [ ] Add a justifying comment for each new ceiling; use named `const`s. State schema values are internal — size them to comfortably fit real task state
- [ ] Validate (targeted — fast): `node scripts/eslint --fix <changed files>` and `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`. Run `node scripts/jest` on any co-located `*.test.ts` you touched. Fix all errors before marking done.

### Task 6: Final validation
- [ ] Run `node scripts/check --scope branch` and fix all failures (catches cross-task regressions the per-task checks can't see)
