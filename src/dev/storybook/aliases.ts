/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Please also add new aliases to .buildkite/scripts/steps/storybooks/build_and_upload.ts
//
// If you wish for your Storybook to be built and included in CI, also add your
// alias to .buildkite/scripts/steps/storybooks/build_and_upload.ts
export const storybookAliases = {
  apm: 'x-pack/observability/apm/.storybook',
  canvas: 'x-pack/platform/internal/canvas/storybook',
  cases: 'packages/kbn-cases-components/.storybook',
  cell_actions: 'packages/kbn-cell-actions/.storybook',
  cloud_chat: 'x-pack/platform/internal/cloud_integrations/cloud_chat/.storybook',
  coloring: 'packages/kbn-coloring/.storybook',
  language_documentation_popover: 'packages/kbn-language-documentation-popover/.storybook',
  chart_icons: 'packages/kbn-chart-icons/.storybook',
  content_management_examples: 'examples/content_management_examples/.storybook',
  controls: 'src/platform/controls/storybook',
  custom_icons: 'packages/kbn-custom-icons/.storybook',
  custom_integrations: 'src/platform/custom_integrations/storybook',
  dashboard_enhanced: 'x-pack/platform/internal/dashboard_enhanced/.storybook',
  dashboard: 'src/platform/dashboard/.storybook',
  data: 'src/platform/data/.storybook',
  discover: 'src/platform/discover/.storybook',
  embeddable: 'src/platform/embeddable/.storybook',
  es_ui_shared: 'src/platform/es_ui_shared/.storybook',
  expandable_flyout: 'packages/kbn-expandable-flyout/.storybook',
  expression_error: 'src/platform/expression_error/.storybook',
  expression_image: 'src/platform/expression_image/.storybook',
  expression_metric_vis: 'src/platform/chart_expressions/expression_legacy_metric/.storybook',
  expression_metric: 'src/platform/expression_metric/.storybook',
  expression_partition_vis: 'src/platform/chart_expressions/expression_partition_vis/.storybook',
  expression_repeat_image: 'src/platform/expression_repeat_image/.storybook',
  expression_reveal_image: 'src/platform/expression_reveal_image/.storybook',
  expression_shape: 'src/platform/expression_shape/.storybook',
  expression_tagcloud: 'src/platform/chart_expressions/expression_tagcloud/.storybook',
  fleet: 'x-pack/platform/fleet/.storybook',
  grouping: 'packages/kbn-securitysolution-grouping/.storybook',
  home: 'src/platform/home/.storybook',
  infra: 'x-pack/plugins/observability_solution/infra/.storybook',
  kibana_react: 'src/platform/kibana_react/.storybook',
  lists: 'x-pack/security/lists/.storybook',
  logs_explorer: 'x-pack/observability/logs_explorer/.storybook',
  management: 'packages/kbn-management/storybook/config',
  observability: 'x-pack/observability/observability/.storybook',
  observability_ai_assistant: 'x-pack/observability/observability_ai_assistant/.storybook',
  presentation: 'src/platform/presentation_util/storybook',
  random_sampling: 'x-pack/packages/kbn-random-sampling/.storybook',
  text_based_editor: 'packages/kbn-text-based-editor/.storybook',
  security_solution: 'x-pack/security/security_solution/.storybook',
  security_solution_packages: 'x-pack/packages/security-solution/storybook/config',
  serverless: 'packages/serverless/storybook/config',
  shared_ux: 'packages/shared-ux/storybook/config',
  slo: 'x-pack/observability/slo/.storybook',
  threat_intelligence: 'x-pack/security/threat_intelligence/.storybook',
  triggers_actions_ui: 'x-pack/platform/triggers_actions_ui/.storybook',
  ui_actions_enhanced: 'src/platform/ui_actions_enhanced/.storybook',
  unified_search: 'src/platform/unified_search/.storybook',
  profiling: 'x-pack/observability/profiling/.storybook',
};
