/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OxlintOverride } from 'oxlint';

/**
 * Release-branch only. The lint config was backported from main without the source changes that
 * came with each rule on main (hook refactors, Core-private import moves, newer custom rules), so
 * these files turn off the rules they would fail. Do not forward-port.
 */
export const releaseBranchOverrides: OxlintOverride[] = [
  {
    files: [
      'x-pack/platform/plugins/shared/maps/public/actions/map_actions.test.ts',
    ],
    rules: { '@kbn/compat/typescript-no-var-requires': 'off' },
  },
  {
    files: [
      'packages/kbn-rspack-optimizer/src/integration_tests/watch_ignore.test.ts',
      'src/platform/packages/shared/kbn-synthtrace/src/lib/shared/base_kibana_client.ts',
      'x-pack/platform/packages/shared/kbn-ai-tools/src/tools/describe_dataset/index.ts',
      'x-pack/platform/packages/shared/kbn-nightshift-ai/src/significant_events/features/computed/index.ts',
      'x-pack/platform/plugins/private/otel_telemetry_collection/server/lib/services/artifact.ts',
      'x-pack/platform/plugins/private/upgrade_assistant/server/routes/cloud_stack_versions.ts',
      'x-pack/platform/plugins/shared/streams/server/routes/internal/streams/management/suggest_processing_pipeline_route.ts',
      'x-pack/solutions/observability/plugins/significant_events/server/agent_builder/skills/ki_query_generation/validate_queries/tool.ts',
      'x-pack/solutions/observability/plugins/significant_events/server/lib/significant_events/features/fetch_sample_documents.ts',
      'x-pack/solutions/observability/plugins/significant_events/server/lib/significant_events/identify_ki_queries_via_agent.ts',
      'x-pack/solutions/observability/plugins/significant_events/server/step_definitions/run_probe.ts',
    ],
    rules: { '@kbn/eslint/no_abort_signal_timeout': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/cloud/server/cloud_data/persist_token.ts',
    ],
    rules: { '@kbn/eslint/no_browser_imports_in_server': 'off' },
  },
  {
    files: [
      'src/platform/plugins/shared/workflows_execution_engine/server/step/kibana_action_step.ts',
      'src/platform/plugins/shared/workflows_management/server/services/workflow_crud_service.ts',
      'src/platform/plugins/shared/workflows_management/server/services/workflow_validation_service.ts',
      'x-pack/solutions/observability/plugins/significant_events/server/lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled.ts',
    ],
    rules: { '@kbn/eslint/no_feature_flag_snapshot': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/rule_registry/server/rule_data_plugin_service/resource_installer.test.ts',
    ],
    rules: { '@kbn/eslint/no_uncleared_race_timeout': 'off' },
  },
  {
    files: [
      'x-pack/platform/test/cases_api_integration/common/plugins/cases/server/routes.ts',
    ],
    rules: { '@kbn/eslint/no_unsafe_hash': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-scout/src/types/test_config.schema.ts',
      'x-pack/platform/plugins/shared/alerting/common/workflows/triggers/alert_status_changed.ts',
    ],
    rules: { '@kbn/eslint/require_lazy_zod_schema': 'off' },
  },
  {
    files: [
      'src/platform/plugins/shared/workflows_management/test/scout/api/tests/workflow_execution/sync_child_hitl_identity.spec.ts',
    ],
    rules: { '@kbn/eslint/scout_require_api_client_in_api_test': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/osquery/cypress/lib/kibana_roles/role_loader.ts',
      'x-pack/platform/test/alerting_api_integration/common/plugins/alerts/server/sub_action_connector.ts',
      'x-pack/solutions/security/test/security_solution_api_integration/config/services/spaces_service.ts',
    ],
    rules: { '@kbn/eslint/security_imports_restriction': 'off' },
  },
  {
    files: [
      'src/platform/plugins/shared/data_views/public/services/has_data.test.ts',
      'src/platform/plugins/shared/files/server/routes/file_kind/upload.test.ts',
      'src/platform/plugins/shared/saved_search/common/service/extract_tabs.test.ts',
      'src/platform/plugins/shared/saved_search/public/service/create_get_saved_search_deps.test.ts',
      'src/platform/plugins/shared/workflows_management/public/components/workflows_app_layout/use_workflows_solution_nav.ts',
      'src/platform/test/plugin_functional/plugins/core_plugin_deep_links/public/plugin.tsx',
      'src/platform/test/plugin_functional/test_suites/saved_objects_management/hidden_types.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/generate/generate_from_jobparams.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/bulk_delete/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/bulk_disable/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/bulk_enable/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/create/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/list/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/internal/scheduled_reports/update/index.ts',
      'x-pack/platform/plugins/private/reporting/server/routes/public/generate_from_jobparams.ts',
      'x-pack/platform/plugins/shared/context_engine/public/application/pages/ai_index_detail_page.test.tsx',
      'x-pack/platform/plugins/shared/context_engine/public/application/pages/create_ai_index_page.test.tsx',
      'x-pack/platform/plugins/shared/context_engine/public/application/pages/view_ki_page.test.tsx',
      'x-pack/platform/plugins/shared/lens/public/app_plugin/app.test.tsx',
      'x-pack/platform/plugins/shared/notification_center/server/storage/user_storage.test.ts',
      'x-pack/platform/plugins/shared/osquery/server/handlers/action/create_queries.ts',
      'x-pack/platform/plugins/shared/osquery/server/utils/get_internal_saved_object_client.ts',
      'x-pack/platform/plugins/shared/security/public/account_management/user_profile/user_profile_api_client.test.ts',
      'x-pack/platform/test/serverless/functional/test_suites/saved_objects_management/hidden_types.ts',
    ],
    rules: { '@kbn/imports/no_group_crossing_imports': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-workflows-ui/src/hooks/use_workflows_monaco_theme.ts',
      'x-pack/platform/plugins/shared/agent_builder_platform/public/attachment_types/skill_attachment/skill_diff_viewer.tsx',
      'x-pack/platform/plugins/shared/streams_app/public/components/stream_management/data_management/shared/doc_viewer_diff.tsx',
    ],
    rules: { '@kbn/kbn-monaco/no_direct_monaco_theme_calls': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-typed-react-router-config/src/types/index.ts',
    ],
    rules: { '@typescript-eslint/unified-signatures': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/kbn-safer-lodash-set/lodash/_baseSet.js',
    ],
    rules: { 'no-undef': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/ml/public/application/jobs/jobs_list/components/start_datafeed_modal/time_range_selector/time_range_selector.js',
      'x-pack/solutions/security/plugins/alertzero/scripts/seed_triage_decisions.js',
    ],
    rules: { 'no-use-before-define': 'off' },
  },
  {
    files: [
      'src/platform/packages/private/kbn-dev-comments/src/components/resolved_anchors.tsx',
      'src/platform/packages/private/kbn-grid-layout/grid/grid_panel/grid_panel.tsx',
      'src/platform/packages/private/kbn-grid-layout/grid/grid_section/grid_section_header.tsx',
      'src/platform/packages/private/kbn-grid-layout/grid/grid_section/grid_section_wrapper.tsx',
      'src/platform/packages/shared/kbn-react-hooks/src/use_abortable_async/use_abortable_async.ts',
      'src/platform/plugins/shared/discover/public/context_awareness/profile_providers/example/example_data_source_profile/components/chart_with_custom_buttons.tsx',
      'x-pack/platform/packages/shared/kbn-ai-assistant/src/hooks/use_abortable_async.ts',
      'x-pack/platform/plugins/shared/aiops/public/components/log_rate_analysis_results_table/use_columns.tsx',
      'x-pack/platform/plugins/shared/dataset_quality/public/hooks/use_dataset_telemetry.ts',
      'x-pack/platform/plugins/shared/index_management/public/application/components/template_form/template_form.tsx',
      'x-pack/platform/plugins/shared/ml/public/alerting/job_selector.tsx',
      'x-pack/platform/plugins/shared/ml/public/application/components/anomalies_table/links_menu.tsx',
      'x-pack/platform/plugins/shared/ml/public/application/explorer/explorer.tsx',
      'x-pack/platform/plugins/shared/ml/public/embeddables/anomaly_swimlane/anomaly_swimlane_embeddable_factory.test.tsx',
      'x-pack/platform/plugins/shared/observability_ai_assistant/public/hooks/use_abortable_async.ts',
      'x-pack/platform/plugins/shared/osquery/public/fleet_integration/config_uploader.tsx',
      'x-pack/platform/plugins/shared/osquery/public/packs/form/pack_uploader.tsx',
      'x-pack/solutions/observability/plugins/apm/public/components/alerting/ui_components/alerting_flyout/index.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/common/components/events_viewer/index.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/detections/components/alerts/filters/page_filters.test.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/detections/components/attacks/filters/page_filters.test.tsx',
    ],
    rules: { 'react-hooks/exhaustive-deps': 'off' },
  },
  {
    files: [
      'src/platform/packages/shared/content-management/content_list/kbn-content-list-provider/src/features/url_sync/router_context.ts',
      'src/platform/packages/shared/content-management/table_list_view_table/src/use_url_state.ts',
      'src/platform/plugins/shared/charts/public/services/theme/theme.ts',
      'src/platform/plugins/shared/discover/public/components/data_types/logs/service_name_cell.tsx',
      'src/platform/plugins/shared/embeddable/public/drilldowns/drilldown_manager_ui/state/drilldown_manager.ts',
      'src/platform/plugins/shared/embeddable/public/drilldowns/drilldown_manager_ui/state/drilldowns_manager.ts',
      'src/platform/plugins/shared/embeddable/public/ui_actions/customize_panel_action/cps_usage_overrides_badge.tsx',
      'src/platform/plugins/shared/share/common/url_service/locators/locator.ts',
      'src/platform/plugins/shared/share/common/url_service/locators/locator_client.ts',
      'src/platform/plugins/shared/unified_search/public/query_string_input/query_bar_top_row.tsx',
      'x-pack/platform/packages/shared/response-ops/alerts-table/components/alerts_data_grid.test.tsx',
      'x-pack/platform/plugins/shared/cases/public/components/markdown_editor/comment_editor.tsx',
      'x-pack/solutions/observability/plugins/exploratory_view/public/components/shared/exploratory_view/embeddable/index.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/agent_builder/components/security_redux_embedded_provider.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/detection_engine/rule_monitoring/logic/execution_settings/use_execution_settings.ts',
      'x-pack/solutions/security/plugins/security_solution/public/flyout_v2/shared/components/flyout_provider.tsx',
    ],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/osquery/public/components/schedule_section/frequency_selector.tsx',
      'x-pack/platform/plugins/shared/osquery/public/results/unified_results_table.tsx',
      'x-pack/solutions/security/plugins/lists/public/exceptions/components/builder/entry_renderer.tsx',
    ],
    rules: { 'react-perf/jsx-no-new-array-as-prop': 'off' },
  },
  {
    files: [
      'x-pack/platform/plugins/shared/osquery/public/actions/components/run_by_filter_popover.tsx',
      'x-pack/platform/plugins/shared/osquery/public/components/schedule_section/__tests__/test_helpers.tsx',
      'x-pack/platform/plugins/shared/osquery/public/components/table_toolbar/created_by_filter_popover.tsx',
      'x-pack/solutions/security/plugins/lists/public/exceptions/components/builder/entry_renderer.tsx',
    ],
    rules: { 'react-perf/jsx-no-new-object-as-prop': 'off' },
  },
  {
    files: [
      'x-pack/solutions/security/packages/kbn-cloud-security-posture/graph/src/components/popovers/primitives/graph_popover.stories.tsx',
      'x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/results/attack_discovery_panel/panel_header/primary_interactions/subtitle/index.tsx',
    ],
    rules: { 'react/jsx-no-literals': 'off' },
  },
];
