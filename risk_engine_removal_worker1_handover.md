# Worker 1 Handover (PR 1: Frontend Deletions)

## Branch / Worktree

- Branch: `risk-engine-removal-pr1-frontend`
- Worktree: `~/dev/kibana.risk-engine-removal-pr1-frontend`
- Base: `main`

## Progress Completed

Implemented the PR 1 frontend risk-engine removal pass, focused on public-side cleanup and entity-store-only behavior in touched paths:

- Removed legacy risk engine lifecycle hooks and consumers in `public/`.
- Removed V1/V2 conditional branches in key touched frontend paths, keeping entity-store path.
- Simplified host/user flyout right panels to store-first/store-only behavior in touched files.
- Removed direct legacy `RISK_ENGINE_*_URL` usage from the touched public entity analytics API layer.

## Files Deleted

- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_init_risk_engine_mutation.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_enable_risk_engine_mutation.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_disable_risk_engine_mutation.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_calculate_entity_risk_score.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_calculate_entity_risk_score.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/hooks/use_toggle_entity_analytics.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/run_risk_engine_button.tsx`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_schedule_now_risk_engine_mutation.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_schedule_now_risk_engine_mutation.test.tsx`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/asset_criticality_file_uploader/components/schedule_risk_engine_callout.tsx`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/asset_criticality_file_uploader/components/schedule_risk_engine_callout.test.tsx`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/risk_score_configurable_risk_engine_settings_hooks.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_query.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_query.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_mutations.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_mutations.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_state.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/hooks/use_risk_engine_settings_state.test.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_risk_engine_settings.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_configure_risk_engine_saved_object.ts`
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_analytics_management_page.test.tsx`

## Files Edited

- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/api.ts`
  - Removed risk-engine route constants and legacy branches; retained maintainer/entity-store path in touched methods.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/hooks/use_toggle_entity_analytics.ts`
  - Removed risk-engine init/enable/disable flow; toggle now controls entity store flow only.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/hooks/use_entity_analytics_status.ts`
  - Removed `RiskEngineStatusEnum` status logic and simplified to entity store status derivation.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/entity_analytics_toggle.tsx`
  - Simplified props and error wiring for entity-store-only toggle path.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/pages/entity_analytics_management_page.tsx`
  - Removed legacy risk-engine settings surfaces and related management wiring.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_score_management/risk_score_tab.tsx`
  - Removed run-now/settings interaction from this tab in the touched implementation.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/entity_store/components/dashboard_enablement_panel.tsx`
  - Removed dependency on risk-engine settings hooks and adapted to simplified toggle API.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/watchlists/components/hooks/use_risk_levels_esql_query.ts`
  - Removed risk-engine status query gating from watchlist risk-level query flow.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/asset_criticality_file_uploader/components/result_step.tsx`
  - Removed schedule-risk-engine callout usage.
- `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/api/hooks/use_risk_engine_privileges.ts`
  - Switched to entity-store v2 privilege check route.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/shared/hooks/use_entity_from_store.ts`
  - Removed V1 query path and conditional branching, keeping entity-store path.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/shared/entity_store_risk_utils.ts`
  - Added helper for empty risk-score state for store-only paths.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/host_right/index.tsx`
  - Removed V1 fallback/risk-score API fallback path in touched logic.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/user_right/index.tsx`
  - Removed V1 fallback/risk-score API fallback path in touched logic.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/host_right/content.tsx`
  - Removed `hasEngineBeenInstalled` check.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/user_right/content.tsx`
  - Removed `hasEngineBeenInstalled` check.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/service_right/index.tsx`
  - Replaced deleted calculate-hook usage with refetch callback path.
- `x-pack/solutions/security/plugins/security_solution/public/flyout/entity_details/generic_right/index.tsx`
  - Replaced deleted calculate-hook usage with refetch callback path.
- `x-pack/solutions/security/plugins/security_solution/public/explore/hosts/pages/details/index.tsx`
  - Replaced deleted calculate-hook usage with refetch callback path.
- `x-pack/solutions/security/plugins/security_solution/public/explore/users/pages/details/index.tsx`
  - Replaced deleted calculate-hook usage with refetch callback path.
- `x-pack/solutions/security/plugins/security_solution/public/agent_builder/components/entity_card_flyout_overview_canvas.tsx`
  - Replaced deleted calculate-hook usage in host/user/service overview canvases.

## Uncertainties / Risks

1. Type-check final status not conclusively captured due to tooling/session instability while command was running.
   - Bootstrap succeeded (`yarn kbn bootstrap`).
   - Re-run needed for definitive result:
     - `node scripts/type_check --project x-pack/solutions/security/plugins/security_solution/tsconfig.json`

2. Possible scope breadth risk:
   - Additional risk-engine settings/schedule files and tests were removed where they became dead/contradictory to entity-store-only behavior.
   - This appears aligned with PR intent but should be confirmed by orchestrator.

3. Risk-engine concept files intentionally left untouched (naming/privilege/callout semantics):
   - `x-pack/solutions/security/plugins/security_solution/public/explore/hosts/pages/navigation/host_risk_score_tab_body.tsx`
   - `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/user_risk_score_tab_body.tsx`
   - `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/components/risk_engine_privileges_callout/*`
   - `x-pack/solutions/security/plugins/security_solution/public/entity_analytics/hooks/use_missing_risk_engine_privileges.ts`

## Recommended Next Steps for Orchestrator

1. Re-run scoped type check and resolve any remaining compile errors.
2. Confirm whether remaining risk-engine privilege/callout semantics are in PR 1 scope or deferred.
3. Sanity-test touched UX paths:
   - Entity analytics management page and toggle flow
   - Host/user/service/generic flyout right panels
   - Host/user details pages
   - Agent builder entity card flyout overview canvases
