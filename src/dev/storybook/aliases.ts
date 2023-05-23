/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Please also add new aliases to test/scripts/jenkins_storybook.sh
export const storybookAliases = {
  apm: 'x-pack/plugins/apm/.storybook',
  canvas: 'x-pack/plugins/canvas/storybook',
  cases: 'packages/kbn-cases-components/.storybook',
  cell_actions: 'packages/kbn-cell-actions/.storybook',
  ci_composite: '.ci/.storybook',
  cloud_chat: 'x-pack/plugins/cloud_integrations/cloud_chat/.storybook',
  coloring: 'packages/kbn-coloring/.storybook',
  language_documentation_popover: 'packages/kbn-language-documentation-popover/.storybook',
  chart_icons: 'packages/kbn-chart-icons/.storybook',
  content_management: 'packages/content-management/.storybook',
  content_management_examples: 'examples/content_management_examples/.storybook',
  controls: 'src/plugins/controls/storybook',
  custom_integrations: 'src/plugins/custom_integrations/storybook',
  dashboard_enhanced: 'x-pack/plugins/dashboard_enhanced/.storybook',
  dashboard: 'src/plugins/dashboard/.storybook',
  data: 'src/plugins/data/.storybook',
  discover: 'src/plugins/discover/.storybook',
  embeddable: 'src/plugins/embeddable/.storybook',
  es_ui_shared: 'src/plugins/es_ui_shared/.storybook',
  expression_error: 'src/plugins/expression_error/.storybook',
  expression_image: 'src/plugins/expression_image/.storybook',
  expression_metric_vis: 'src/plugins/chart_expressions/expression_legacy_metric/.storybook',
  expression_metric: 'src/plugins/expression_metric/.storybook',
  expression_partition_vis: 'src/plugins/chart_expressions/expression_partition_vis/.storybook',
  expression_repeat_image: 'src/plugins/expression_repeat_image/.storybook',
  expression_reveal_image: 'src/plugins/expression_reveal_image/.storybook',
  expression_shape: 'src/plugins/expression_shape/.storybook',
  expression_tagcloud: 'src/plugins/chart_expressions/expression_tagcloud/.storybook',
  fleet: 'x-pack/plugins/fleet/.storybook',
  grouping: 'packages/kbn-securitysolution-grouping/.storybook',
  home: 'src/plugins/home/.storybook',
  infra: 'x-pack/plugins/infra/.storybook',
  kibana_react: 'src/plugins/kibana_react/.storybook',
  lists: 'x-pack/plugins/lists/.storybook',
  observability: 'x-pack/plugins/observability/.storybook',
  presentation: 'src/plugins/presentation_util/storybook',
  random_sampling: 'x-pack/packages/kbn-random-sampling/.storybook',
  text_based_editor: 'packages/kbn-text-based-editor/.storybook',
  security_solution: 'x-pack/plugins/security_solution/.storybook',
  security_solution_packages: 'x-pack/packages/security-solution/storybook/config',
  serverless: 'packages/serverless/storybook/config',
  shared_ux: 'packages/shared-ux/storybook/config',
  threat_intelligence: 'x-pack/plugins/threat_intelligence/.storybook',
  triggers_actions_ui: 'x-pack/plugins/triggers_actions_ui/.storybook',
  ui_actions_enhanced: 'src/plugins/ui_actions_enhanced/.storybook',
  unified_search: 'src/plugins/unified_search/.storybook',
  profiling: 'x-pack/plugins/profiling/.storybook',
};
