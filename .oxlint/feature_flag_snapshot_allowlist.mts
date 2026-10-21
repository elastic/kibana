/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Temporary exceptions for `@kbn/eslint/no_feature_flag_snapshot`.
 * Delete a path in the PR that addresses that file:
 * - subscribe for as long as the decision should follow the flag, or
 * - when the function already runs on every action, disable the line and say why:
 *   // eslint-disable-next-line @kbn/eslint/no_feature_flag_snapshot -- <why this read runs every time>
 *
 * https://github.com/elastic/kibana/issues/293566
 *
 * `is_workflows_enabled` is called again on each action, and also once from
 * `discoveries/server/plugin.ts` during startup. That startup freeze is not visible
 * to this rule.
 */
export const featureFlagSnapshotAllowlist: readonly string[] = [
  'src/platform/plugins/private/vis_types/vega/public/embeddable/vega_embeddable.tsx',
  'src/platform/plugins/private/vis_types/vega/server/plugin.ts',
  'src/platform/plugins/shared/discover/public/build_services.ts',
  'src/platform/plugins/shared/workflows_execution_engine/server/step/kibana_action_step.ts',
  'src/platform/plugins/shared/workflows_management/server/services/workflow_crud_service.ts',
  'src/platform/plugins/shared/workflows_management/server/services/workflow_validation_service.ts',
  'x-pack/platform/plugins/shared/elastic_console/public/plugin.tsx',
  'x-pack/platform/plugins/shared/elastic_console/server/routes/is_enabled.ts',
  'x-pack/platform/plugins/shared/entity_store/server/infra/feature_flags/dual_process.ts',
  'x-pack/platform/plugins/shared/entity_store/server/infra/feature_flags/legacy_security_assets_migration.ts',
  'x-pack/platform/plugins/shared/fleet/server/services/outputs/helpers.ts',
  'x-pack/platform/plugins/shared/fleet/server/services/outputs/kafka_auth_feature_flags.ts',
  'x-pack/platform/plugins/shared/fleet/server/services/utils/iac_provisioner.ts',
  'x-pack/platform/plugins/shared/fleet/server/services/utils/sentinel_policy_version.ts',
  'x-pack/platform/plugins/shared/ingest_hub/public/onboarding/core/register_onboarding_app.ts',
  'x-pack/platform/plugins/shared/ingest_hub/public/plugin.tsx',
  'x-pack/platform/plugins/shared/lens/common/feature_flags.ts',
  'x-pack/platform/plugins/shared/logs_shared/public/plugin.tsx',
  'x-pack/platform/plugins/shared/notification_center/server/lib/submit.ts',
  'x-pack/solutions/observability/plugins/apm/server/plugin.ts',
  'x-pack/solutions/observability/plugins/infra/public/plugin.ts',
  'x-pack/solutions/observability/plugins/infra/server/lib/log_analysis/common.ts',
  'x-pack/solutions/observability/plugins/nightshift_investigations/server/custom_context/custom_context_client.ts',
  'x-pack/solutions/observability/plugins/nightshift_investigations/server/is_investigation_available.ts',
  'x-pack/solutions/observability/plugins/nightshift_investigations/server/sandbox_secrets/sandbox_secrets_client.ts',
  'x-pack/solutions/observability/plugins/nightshift_investigations/server/tools/sandbox_bash/sandbox_tool_availability.ts',
  'x-pack/solutions/observability/plugins/significant_events/server/lib/feature_flags/is_significant_events_feature_flag_enabled.ts',
  'x-pack/solutions/observability/plugins/significant_events/server/lib/semantic_code_search_grounding/is_significant_events_semantic_code_search_grounding_enabled.ts',
  'x-pack/solutions/observability/plugins/slo/server/utils/is_composite_slo_enabled.ts',
  'x-pack/solutions/observability/plugins/synthetics/public/plugin.ts',
  'x-pack/solutions/security/packages/kbn-discoveries/impl/lib/helpers/is_workflows_enabled/index.ts',
  'x-pack/solutions/security/plugins/discoveries/public/plugin.ts',
  'x-pack/solutions/security/plugins/security_solution/public/attack_discovery/pages/use_attack_discovery/index.tsx',
  'x-pack/solutions/security/plugins/security_solution_ess/public/navigation/navigation_tree.ts',
  'x-pack/solutions/security/plugins/security_solution_serverless/public/navigation/navigation.ts',
  'x-pack/solutions/security/plugins/security_solution_serverless/public/navigation/navigation_tree.ts',
];
