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
  codeeditor: 'src/plugins/kibana_react/public/code_editor/.storybook',
  ci_composite: '.ci/.storybook',
  url_template_editor: 'src/plugins/kibana_react/public/url_template_editor/.storybook',
  dashboard: 'src/plugins/dashboard/.storybook',
  dashboard_enhanced: 'x-pack/plugins/dashboard_enhanced/.storybook',
  data_enhanced: 'x-pack/plugins/data_enhanced/.storybook',
  embeddable: 'src/plugins/embeddable/.storybook',
  infra: 'x-pack/plugins/infra/.storybook',
  security_solution: 'x-pack/plugins/security_solution/.storybook',
  ui_actions_enhanced: 'x-pack/plugins/ui_actions_enhanced/.storybook',
  observability: 'x-pack/plugins/observability/.storybook',
  presentation: 'src/plugins/presentation_util/storybook',
};
