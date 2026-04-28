# Worker 2 Handover (PR 2: Backend Deletions)

## Branch / Worktree

- Branch: `risk-engine-removal-pr2-backend`
- Worktree: `~/dev/kibana.risk-engine-removal-pr2-backend`
- Base: `main`

## Progress Completed

Implemented the PR 2 backend risk-engine removal pass, focused on removing legacy server-side lifecycle/task/service code and keeping the risk score preview path independent of deleted risk-engine clients:

- Removed legacy risk engine route modules and risk engine data client modules.
- Removed legacy risk scoring task-manager task modules.
- Removed legacy risk score service modules and entity calculation route modules.
- Removed request context and type-contract exposure of `getRiskEngineDataClient`.
- Removed plugin setup registration for `registerRiskScoringTask`.
- Removed risk engine route registration from entity analytics route wiring.
- Rewired risk score preview route to call `calculateRiskScores` directly (no deleted `risk_score_service` dependency).
- Localized `TASK_MANAGER_UNAVAILABLE_ERROR` in entity store delete route to avoid importing from deleted risk-engine translations.

## Files Deleted

- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/audit.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/risk_engine_data_client.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/risk_engine_data_client.mock.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/risk_engine_data_client.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/risk_engine_privileges.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/risk_engine_privileges.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/configure_saved_object.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/configure_saved_object.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/delete.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/delete.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/disable.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/disable.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/enable.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/enable.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/index.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/init.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/privileges.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/register_risk_engine_routes.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/risk_engine_privileges.mock.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/schedule_now.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/settings.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/status.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/routes/translations.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/risk_score_service.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/risk_score_service.mock.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/entity_calculation.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/entity_calculation.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/helpers.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/constants.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/index.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/risk_scoring_task.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/risk_scoring_task.mock.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/risk_scoring_task.test.ts`
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/tasks/state.ts`

## Files Edited

- `x-pack/solutions/security/plugins/security_solution/server/plugin.ts`
  - Removed `registerRiskScoringTask` import and setup-time registration block.
- `x-pack/solutions/security/plugins/security_solution/server/request_context_factory.ts`
  - Removed `RiskEngineDataClient` creation and `getRiskEngineDataClient` context accessor.
- `x-pack/solutions/security/plugins/security_solution/server/types.ts`
  - Removed `getRiskEngineDataClient` from `SecuritySolutionApiRequestHandlerContext`.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/register_entity_analytics_routes.ts`
  - Removed `registerRiskEngineRoutes(...)` call.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/register_risk_score_routes.ts`
  - Removed registration of entity calculation routes; preview route remains.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/preview.ts`
  - Replaced legacy service wiring with direct `calculateRiskScores` call and saved-object config read.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/entity_store/routes/delete.ts`
  - Inlined `TASK_MANAGER_UNAVAILABLE_ERROR` to remove dependency on deleted risk-engine translations module.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_engine/migrations/update_risk_score_mappings.ts`
  - Replaced deleted `RiskEngineDataClient.updateConfiguration(...)` usage with `updateSavedObjectAttribute(...)`.
- `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/routes/__mocks__/request_context.ts`
  - Removed risk-engine data client mock wiring from request context mocks.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/routes/preview.test.ts`
  - Updated test wiring to mock `calculateRiskScores`/`getConfiguration` instead of deleted risk score service factory.
- `x-pack/solutions/security/plugins/security_solution/server/lib/entity_analytics/risk_score/risk_engine_data_writer.test.ts`
  - Replaced deleted `riskScoreServiceMock` usage with local score fixture helper.

## Uncertainties / Risks

1. Type-check final status needs one more explicit confirmation run.
   - During execution, scoped type-check surfaced one TS error in `update_risk_score_mappings.ts` and that error was fixed.
   - A final full scoped re-run should be executed by orchestrator to capture clean completion output.

2. Prompt-to-branch drift:
   - PR prompt references paths like `server/lib/entity_analytics/entity_details/.../entity_details_highlight.ts` and an ESQL V2 preview dual-path branch (`calculateScoresWithESQLV2`) that are not present in this checkout.
   - Changes were applied to equivalent available backend paths in this branch.

3. Untracked local artifact in worktree:
   - `.cursor/` appears as untracked in this worktree and was intentionally not touched.

## Recommended Next Steps for Orchestrator

1. Re-run scoped plugin type-check in this worktree for definitive green status:
   - `NODE_OPTIONS="--max-old-space-size=8192" node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`
2. Run targeted server tests for touched routes/migrations:
   - `risk_score/routes/preview.test.ts`
   - `risk_engine/migrations/update_risk_score_mappings.test.ts`
   - `risk_score/risk_engine_data_writer.test.ts`
3. Confirm that remaining risk-engine naming constants/enums in shared/common are intentionally deferred to later PRs (as per plan).
