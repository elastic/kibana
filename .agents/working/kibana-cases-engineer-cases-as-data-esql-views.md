# Cases Analytics ES|QL Views

## North Star
Goal: Replace the cases analytics reindex pipeline with three ES|QL views (`cases.case`, `cases.case_activity`, `cases.case_lifecycle`) that read directly from `.kibana_alerting_cases`. Eliminates the painless scripts, sync tasks, mapping versions, shard cap, and the per-(owner, space) index multiplication.
Out of scope:
- Modifying or removing the existing 4-index pipeline (`cases_index/comments_index/attachments_index/activity_index`) — kept as fallback for clusters without ES|QL view support
- The ES `kibana-cases-security` plugin DLS work (parallel ES PR; we depend on it but do not author it)
- Renaming or restructuring `.kibana_alerting_cases` SO mappings
- UI changes to the configure panel (status route is exposed; UI consumption is a follow-up)
- ES|QL editor / Discover integration of the views (separate effort)
- New SO fields, model versions, migrations, user actions, or authorization operations

## Key Constraints
SO changes: none.
Auth: two new internal routes — `GET /internal/cases/_analytics/status` (gated by `Operations.GetCaseMetrics`), `DELETE /internal/cases/_analytics/legacy_indices` (gated by `Operations.DeleteCase`). No new operations.
User action types: none (read-only feature).
Feature flag: `xpack.cases.analytics.views.enabled` (default `false`). Combined with existing `xpack.cases.analytics.index.enabled` and the runtime probe `GET _query/view`, this gates the views path. Production-safe default: views off until ES DLS work ships.
Exported API changes: none.
Other: View regeneration triggered by wrapping `templatesSubClient.{createTemplate,updateTemplate,deleteTemplate}` in `server/client/templates/client.ts`. Debounced 30s, single-flight per Kibana node.

## Design Decisions
1. Three global views (not per-owner) — owner/space appear as columns; isolation delegated to ES `kibana-cases-security` DLS work. Views remain off in production until DLS lands.
2. Extended fields use union across all owners' templates — overlapping `(name, type)` pairs deduplicate; same `name` with different `type` produces distinct columns.
3. View support detected via `GET _query/view` probe at plugin start — single source of truth for `analyticsMode = 'views' | 'indices'`. Stored on plugin instance, surfaced via `GET /internal/cases/_analytics/status`.
4. View regeneration trigger is the templates **client** wrapper (not a SO hook — Kibana SOs have no native pre/post-write hook). Debounced 30s, single-flight per node.
5. Suffix-to-cast mapping is hard-coded against the `FieldType.type` union: `keyword` → identity (TO_STRING), `long/integer/short/byte/unsigned_long` → `TO_LONG`, `double/float/half_float/scaled_float` → `TO_DOUBLE`, `date` → `TO_DATETIME`.
6. Output column names are `camelCase(name)` (matches `getFieldCamelKey` at `common/utils/template_fields.ts:12`). Type suffix preserved in the column name (e.g. `riskScoreAsLong`).
7. Legacy index cleanup is opt-in via `DELETE /internal/cases/_analytics/legacy_indices` — never auto-deleted.
8. `case_id` for activity rows derived via `MV_FIRST(MV_FILTER(references, ref -> ref.type == "cases").id)`. Validate during snapshot testing; fall back to a writer-side mirror if unsupported.
9. Three views land first on this branch (per user direction); the legacy 4-index pipeline stays as fallback. Live testing uses `node scripts/es snapshot`.
10. Templates SO is enumerated cross-space via `namespaces: ['*']`, paginated, mirroring the pattern from `cases_analytics/utils.ts:12-45`.

## Phase Status
Phase 0 Clarification : [DONE — research complete; PR ordering, snapshot ES, regen trigger locked]
Phase 1 Design        : [DONE — per-owner views (3 surfaces × 3 owners), JSON_EXTRACT-based extended fields, two-flag gate]
Phase 2 Implementation: [DONE — 7 focused commits landed]
Phase 3 Logging       : [DONE — probe debug/warn, view_sync_service error w/ {error}, no console.*, no executionId needed (no task runners added)]
Phase 4 Telemetry     : [DEFERRED — infrastructure feature, gated off by default; product-question telemetry can land alongside the UI consumer follow-up]
Phase 5 Tests         : [DONE for unit; integration tests deferred — require snapshot ES with _query/view support not yet broadly available]
Phase 6 Self-Review   : [IN PROGRESS]
Phase 7 Readiness     : [ ]

## Implementation Contract
<!-- Written at end of Phase 1. Verified mechanically in Phase 6 via grep. -->

MUST CONTAIN (grep to verify):
- [ ] `authorization.ensureAuthorized` in `server/routes/api/internal/get_analytics_status.ts`
- [ ] `authorization.ensureAuthorized` in `server/routes/api/internal/delete_legacy_analytics_indices.ts`
- [ ] `routerOptions: { access: 'internal' }` in both new route files
- [ ] `_query/view/` (or `transport.request` to that path) in `server/cases_analytics/views/view_sync_service.ts`
- [ ] `namespaces: ['*']` in `server/cases_analytics/views/template_fields_loader.ts`
- [ ] `viewSyncService.scheduleRegeneration` (or `enqueueRegeneration`) called in `server/client/templates/client.ts` from each of `createTemplate`, `updateTemplate`, `deleteTemplate`

MUST NOT CONTAIN (grep to verify):
- [ ] `console.log` / `console.error` / `console.warn` in any new file under `server/cases_analytics/views/`
- [ ] `as any` / `: any` in any new file
- [ ] `find(` calls without `perPage` in `server/cases_analytics/views/`
- [ ] Any modification to `cases_index/`, `comments_index/`, `attachments_index/`, `activity_index/` directories (legacy fallback stays untouched)
- [ ] New `userAction` builder file or new value in `common/types/domain/user_action/action/v1.ts`

MUST HAVE TESTS (grep to verify):
- [ ] `extendedFieldsToEval` snapshot test covering every literal in the FieldType `type` union (keyword, long, integer, short, byte, unsigned_long, double, float, half_float, scaled_float, date)
- [ ] `buildCaseViewQuery`, `buildActivityViewQuery`, `buildLifecycleViewQuery` snapshot tests with empty + non-empty extended fields
- [ ] `probeViewSupport` test forcing 200, 404, and unexpected-error branches
- [ ] `viewSyncService` tests: PUTs all three views on regenerate; debounce coalesces bursts; single-flight prevents concurrent PUTs; surfaces ES errors via logger
- [ ] Templates-client wrapper test: regen scheduled after each successful create/update/delete (and NOT scheduled on failure)
- [ ] API integration test: `GET /internal/cases/_analytics/status` returns mode + view names; auth denied for unprivileged user
- [ ] API integration test: `DELETE /internal/cases/_analytics/legacy_indices` removes the listed legacy indices/aliases; auth denied for read-only user

## Open Blockers / Questions
none