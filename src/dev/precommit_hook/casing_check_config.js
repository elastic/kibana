/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * These patterns are used to identify files that are not supposed
 * to be snake_case because their names are determined by other
 * systems or rules.
 *
 * @type {Array}
 */
export const IGNORE_FILE_GLOBS = [
  '.node-version',
  'sonar-project.properties',
  '.github/**/*',
  'docs/**/*',
  '**/bin/**/*',
  '**/+([A-Z_]).md',
  '**/+([A-Z_]).mdx',
  '**/+([A-Z_]).asciidoc',
  '**/LICENSE',
  '**/*.txt',
  '**/{Dockerfile,docker-compose.yml}',
  'x-pack/platform/plugins/private/canvas/tasks/**/*',
  'x-pack/platform/plugins/private/canvas/canvas_plugin_src/**/*',
  'x-pack/platform/plugins/private/canvas/server/templates/assets/*.{png,jpg,svg}',
  'x-pack/platform/plugins/shared/cases/docs/**/*',
  'x-pack/platform/plugins/private/monitoring/public/lib/jquery_flot/**/*',
  'x-pack/platform/plugins/shared/fleet/cypress/packages/*.zip',
  '**/apm-diagnostics-*.json',
  '**/.*',
  '**/__mocks__/**/*',
  'x-pack/docs/**/*',
  'src/core/packages/apps/server-internal/assets/fonts/**/*',
  'src/dev/code_coverage/ingest_coverage/integration_tests/mocks/**/*',
  'src/platform/packages/shared/kbn-utility-types/test-d/**/*',
  'Dockerfile*',
  'vars/*',
  'src/platform/packages/shared/kbn-test/jest-preset.js',
  'src/platform/packages/shared/kbn-test/*/jest-preset.js',
  'test/package/Vagrantfile',
  'x-pack/solutions/security/plugins/security_solution/scripts/endpoint/common/vagrant/Vagrantfile',
  '**/test/**/fixtures/**/*',
  'src/platform/packages/shared/kbn-router-to-openapispec/openapi-types.d.ts',

  // Required to match the name in the docs.elastic.dev repo.
  'dev_docs/nav-kibana-dev.docnav.json',

  // Match elastic wide naming convention for catalog-info.yaml
  'catalog-info.yaml',

  // filename must match language code which requires capital letters
  '**/translations/*.json',

  // Storybook has predetermined filesnames
  '**/preview-body.html',
  '**/preview-head.html',

  // filename must match upstream filenames from lodash
  'src/platform/packages/shared/kbn-safer-lodash-set/**/*',

  // filename must match upstream filenames from handlebars
  'src/platform/packages/private/kbn-handlebars/src/upstream/**/*',
  'src/platform/packages/private/kbn-handlebars/.patches/**/*',

  'x-pack/platform/plugins/shared/maps/server/fonts/**/*',

  'x-pack/solutions/observability/plugins/profiling/Makefile',

  // Bazel default files
  '**/WORKSPACE.bazel',
  '**/BUILD.bazel',

  // Buildkite
  '.buildkite/**/*',

  // generator templates use weird filenames based on the requirements for the files they're generating
  'packages/kbn-generate/templates/**/*',

  // ecs templates
  '**/ecs/fields/**/*',

  // Support for including http-client.env.json configurations
  '**/http-client.env.json',

  // updatecli configuration for driving the UBI/Ironbank image updates
  'updatecli-compose.yaml',
];

/**
 * These patterns are matched against directories and indicate
 * folders that must use kebab case.
 *
 * @type {Array}
 */
export const KEBAB_CASE_DIRECTORY_GLOBS = [
  'packages/*',
  'src/core/packages/*/*',
  'src/platform/packages/private/analytics/utils/*',
  'src/platform/packages/private/default-nav/*',
  'src/platform/packages/private/*',
  'src/platform/packages/private/kbn-import-resolver/src/__fixtures__/packages/*',
  'src/platform/packages/private/kbn-import-resolver/src/__fixtures__/src/*',
  'src/platform/packages/private/kbn-reporting/*',
  'src/platform/packages/private/kbn-reporting/export_types/*',
  'src/platform/packages/private/shared-ux/page/analytics_no_data/*',
  'src/platform/packages/private/shared-ux/page/kibana_no_data/*',
  'src/platform/packages/private/shared-ux/storybook/*',
  'src/platform/packages/shared/*',
  'src/platform/packages/shared/content-management/*',
  'src/platform/packages/shared/content-management/content_insights/*',
  'src/platform/packages/shared/content-management/favorites/*',
  'src/platform/packages/shared/deeplinks/*',
  'src/platform/packages/shared/home/*',
  'src/platform/packages/shared/kbn-management/*',
  'src/platform/packages/shared/kbn-management/settings/*',
  'src/platform/packages/shared/kbn-management/settings/components/*',
  'src/platform/packages/shared/kbn-management/storybook/*',
  'src/platform/packages/shared/presentation/*',
  'src/platform/packages/shared/react/kibana_context/*',
  'src/platform/packages/shared/react/*',
  'src/platform/packages/shared/response-ops/*',
  'src/platform/packages/shared/serverless/settings/*',
  'src/platform/packages/shared/serverless/storybook/*',
  'src/platform/packages/shared/serverless/*',
  'src/platform/packages/shared/shared-ux/avatar/*',
  'src/platform/packages/shared/shared-ux/button/*',
  'src/platform/packages/shared/shared-ux/*',
  'src/platform/packages/shared/shared-ux/card/no_data/*',
  'src/platform/packages/shared/shared-ux/chrome/*',
  'src/platform/packages/shared/shared-ux/code_editor/*',
  'src/platform/packages/shared/shared-ux/file/*',
  'src/platform/packages/shared/shared-ux/file/file_picker/*',
  'src/platform/packages/shared/shared-ux/file/file_upload/*',
  'src/platform/packages/shared/shared-ux/file/image/*',
  'src/platform/packages/shared/shared-ux/link/redirect_app/*',
  'src/platform/packages/shared/shared-ux/markdown/*',
  'src/platform/packages/shared/shared-ux/modal/*',
  'src/platform/packages/shared/shared-ux/page/kibana_template/*',
  'src/platform/packages/shared/shared-ux/page/no_data/*',
  'src/platform/packages/shared/shared-ux/page/no_data_config/*',
  'src/platform/packages/shared/shared-ux/page/*',
  'src/platform/packages/shared/shared-ux/prompt/no_data_views/*',
  'src/platform/packages/shared/shared-ux/prompt/*',
  'src/platform/packages/shared/shared-ux/router/*',
  'src/platform/packages/shared/shared-ux/storybook/*',
  'x-pack',
  'x-pack/dev-tools',
  'x-pack/packages/ai-infra/*',
  'x-pack/packages/*',
  'x-pack/platform/packages/private/*',
  'x-pack/platform/packages/private/maps/*',
  'x-pack/platform/packages/private/ml/*',
  'x-pack/platform/packages/private/security/*',
  'x-pack/platform/packages/shared/ai-assistant/*',
  'x-pack/platform/packages/shared/ai-infra/*',
  'x-pack/platform/packages/shared/*',
  'x-pack/platform/packages/shared/index-lifecycle-management/*',
  'x-pack/platform/packages/shared/index-management/*',
  'x-pack/platform/packages/shared/kbn-cloud-security-posture/*',
  'x-pack/platform/packages/shared/ml/*',
  'x-pack/platform/packages/shared/security/*',
  'x-pack/solutions/observability/packages/*',
  'x-pack/solutions/observability/packages/observability-ai/*',
  'x-pack/solutions/search/packages/*',
  'x-pack/solutions/security/packages/*',
  'x-pack/solutions/security/packages/kbn-cloud-security-posture/*',
  'x-pack/solutions/security/packages/storybook/*',
  'x-pack/test/alerting_api_integration/packages/*',
  'x-pack/test/security_api_integration/packages/*',
];

/**
 * These patterns are matched against directories and indicate
 * explicit folders that are NOT supposed to use snake_case.
 *
 * When a file in one of these directories is checked, the directory
 * matched by these patterns is removed from the path before
 * the casing check so that the files casing is still checked. This
 * allows folders like `src/legacy/ui/public/flot-charts` to exist, which
 * is named to match the npm package and follow the kebab-casing
 * convention there, but allows us to still verify that files within
 * that directory use snake_case
 *
 * @type {Array}
 */
export const IGNORE_DIRECTORY_GLOBS = [
  ...KEBAB_CASE_DIRECTORY_GLOBS,
  'src/babel-*',
  'typings/*',
  'typings/**/*',
];

/**
 * These patterns identify files which should have the extension stripped
 * to reveal the actual name that should be checked.
 *
 * @type {Array}
 */
export const REMOVE_EXTENSION = ['packages/kbn-plugin-generator/template/**/*.ejs'];

/**
 * DO NOT ADD FILES TO THIS LIST!!
 *
 * Use the other configs if the file really shouldn't be snake_case.
 *
 * These paths identify filenames that would be flagged by the current
 * rules but were in violation before we started properly enforcing these
 * rules. They will not cause errors but will log warnings because they
 * will hopefully be updated to use snake_case in the future.
 *
 * IDEALLY will will be able to trim this list over time
 *
 * @type {Array}
 */
export const TEMPORARILY_IGNORED_PATHS = [
  'x-pack/platform/plugins/private/monitoring/public/icons/health-gray.svg',
  'x-pack/platform/plugins/private/monitoring/public/icons/health-green.svg',
  'x-pack/platform/plugins/private/monitoring/public/icons/health-red.svg',
  'x-pack/platform/plugins/private/monitoring/public/icons/health-yellow.svg',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/noto/NotoSansCJKtc-Medium.ttf',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/noto/NotoSansCJKtc-Regular.ttf',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/roboto/Roboto-Italic.ttf',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/roboto/Roboto-Medium.ttf',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/fonts/roboto/Roboto-Regular.ttf',
  'x-pack/platform/plugins/shared/screenshotting/server/assets/img/logo-grey.png',
];
