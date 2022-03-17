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
  ci_composite: '.ci/.storybook',
  cloud: 'x-pack/plugins/cloud/.storybook',
  controls: 'src/plugins/controls/storybook',
  custom_integrations: 'src/plugins/custom_integrations/storybook',
  dashboard_enhanced: 'x-pack/plugins/dashboard_enhanced/.storybook',
  dashboard: 'src/plugins/dashboard/.storybook',
  data_enhanced: 'x-pack/plugins/data_enhanced/.storybook',
  discover: 'src/plugins/discover/.storybook',
  embeddable: 'src/plugins/embeddable/.storybook',
  expression_error: 'src/plugins/expression_error/.storybook',
  expression_image: 'src/plugins/expression_image/.storybook',
  expression_metric_vis: 'src/plugins/chart_expressions/expression_metric/.storybook',
  expression_metric: 'src/plugins/expression_metric/.storybook',
  expression_partition_vis: 'src/plugins/chart_expressions/expression_partition_vis/.storybook',
  expression_repeat_image: 'src/plugins/expression_repeat_image/.storybook',
  expression_reveal_image: 'src/plugins/expression_reveal_image/.storybook',
  expression_shape: 'src/plugins/expression_shape/.storybook',
  expression_tagcloud: 'src/plugins/chart_expressions/expression_tagcloud/.storybook',
  fleet: 'x-pack/plugins/fleet/.storybook',
  infra: 'x-pack/plugins/infra/.storybook',
  kibana_react: 'src/plugins/kibana_react/.storybook',
  lists: 'x-pack/plugins/lists/.storybook',
  observability: 'x-pack/plugins/observability/.storybook',
  presentation: 'src/plugins/presentation_util/storybook',
  security_solution: 'x-pack/plugins/security_solution/.storybook',
  shared_ux: 'packages/kbn-shared-ux-storybook/src/config',
  ui_actions_enhanced: 'x-pack/plugins/ui_actions_enhanced/.storybook',
};
