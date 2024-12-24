/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Please also add new aliases to .buildkite/scripts/steps/storybooks/build_and_upload.ts
//
// If you wish for your Storybook to be built and included in CI, also add your
// alias to .buildkite/scripts/steps/storybooks/build_and_upload.ts
export const storybookAliases = {
  ai_assistant: 'x-pack/packages/kbn-ai-assistant/.storybook',
  apm: 'x-pack/plugins/observability_solution/apm/.storybook',
  canvas: 'x-pack/platform/plugins/private/canvas/storybook',
  cases: 'packages/kbn-cases-components/.storybook',
  cell_actions: 'src/platform/packages/shared/kbn-cell-actions/.storybook',
  cloud_security_posture_packages:
    'x-pack/solutions/security/packages/kbn-cloud-security-posture/.storybook',
  cloud: 'packages/cloud/.storybook',
  coloring: 'packages/kbn-coloring/.storybook',
  language_documentation_popover:
    'src/platform/packages/private/kbn-language-documentation/.storybook',
  chart_icons: 'packages/kbn-chart-icons/.storybook',
  content_management_examples: 'examples/content_management_examples/.storybook',
  custom_icons: 'src/platform/packages/shared/kbn-custom-icons/.storybook',
  custom_integrations: 'src/plugins/custom_integrations/storybook',
  dashboard_enhanced: 'x-pack/platform/plugins/shared/dashboard_enhanced/.storybook',
  dashboard: 'src/platform/plugins/shared/dashboard/.storybook',
  data: 'src/plugins/data/.storybook',
  discover: 'src/plugins/discover/.storybook',
  esql_ast_inspector: 'examples/esql_ast_inspector/.storybook',
  es_ui_shared: 'src/platform/plugins/shared/es_ui_shared/.storybook',
  expandable_flyout: 'x-pack/solutions/security/packages/kbn-expandable-flyout/.storybook',
  expression_error: 'src/platform/plugins/shared/expression_error/.storybook',
  expression_image: 'src/platform/plugins/shared/expression_image/.storybook',
  expression_metric_vis: 'src/plugins/chart_expressions/expression_legacy_metric/.storybook',
  expression_metric: 'src/platform/plugins/shared/expression_metric/.storybook',
  expression_partition_vis: 'src/plugins/chart_expressions/expression_partition_vis/.storybook',
  expression_repeat_image: 'src/platform/plugins/shared/expression_repeat_image/.storybook',
  expression_reveal_image: 'src/platform/plugins/shared/expression_reveal_image/.storybook',
  expression_shape: 'src/platform/plugins/shared/expression_shape/.storybook',
  expression_tagcloud: 'src/plugins/chart_expressions/expression_tagcloud/.storybook',
  fleet: 'x-pack/plugins/fleet/.storybook',
  grouping: 'packages/kbn-grouping/.storybook',
  home: 'src/plugins/home/.storybook',
  infra: 'x-pack/solutions/observability/plugins/infra/.storybook',
  inventory: 'x-pack/plugins/observability_solution/inventory/.storybook',
  investigate: 'x-pack/solutions/observability/plugins/investigate_app/.storybook',
  kibana_react: 'src/plugins/kibana_react/.storybook',
  lists: 'x-pack/solutions/security/plugins/lists/.storybook',
  logs_explorer: 'x-pack/solutions/observability/plugins/logs_explorer/.storybook',
  management: 'packages/kbn-management/storybook/config',
  observability: 'x-pack/solutions/observability/plugins/observability/.storybook',
  observability_ai_assistant:
    'x-pack/platform/plugins/shared/observability_solution/observability_ai_assistant/.storybook',
  observability_ai_assistant_app:
    'x-pack/solutions/observability/plugins/observability_ai_assistant_app/.storybook',
  observability_inventory: 'x-pack/plugins/observability_solution/inventory/.storybook',
  observability_shared: 'x-pack/plugins/observability_solution/observability_shared/.storybook',
  observability_slo: 'x-pack/solutions/observability/plugins/slo/.storybook',
  presentation: 'src/platform/plugins/shared/presentation_util/storybook',
  random_sampling: 'x-pack/packages/kbn-random-sampling/.storybook',
  esql_editor: 'src/platform/packages/private/kbn-esql-editor/.storybook',
  security_solution: 'x-pack/solutions/security/plugins/security_solution/.storybook',
  security_solution_packages: 'x-pack/solutions/security/packages/storybook/config',
  serverless: 'packages/serverless/storybook/config',
  shared_ux: 'packages/shared-ux/storybook/config',
  slo: 'x-pack/solutions/observability/plugins/slo/.storybook',
  threat_intelligence: 'x-pack/solutions/security/plugins/threat_intelligence/.storybook',
  triggers_actions_ui: 'x-pack/plugins/triggers_actions_ui/.storybook',
  ui_actions_enhanced: 'src/plugins/ui_actions_enhanced/.storybook',
  unified_search: 'src/plugins/unified_search/.storybook',
  profiling: 'x-pack/plugins/observability_solution/profiling/.storybook',
};
