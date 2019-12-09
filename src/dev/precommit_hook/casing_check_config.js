/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
  '.github/**/*',
  'docs/**/*',
  '**/bin/**/*',
  '**/+([A-Z_]).md',
  '**/LICENSE',
  '**/*.txt',
  '**/Gruntfile.js',
  'tasks/config/**/*',
  '**/{Dockerfile,docker-compose.yml}',
  'x-pack/legacy/plugins/apm/**/*',
  'x-pack/legacy/plugins/canvas/tasks/**/*',
  'x-pack/legacy/plugins/canvas/canvas_plugin_src/**/*',
  '**/.*',
  '**/{webpackShims,__mocks__}/**/*',
  'x-pack/docs/**/*',
  'src/legacy/ui/public/assets/fonts/**/*',
  'packages/kbn-utility-types/test-d/**/*',
  '**/Jenkinsfile*',
  'Dockerfile*',
  'vars/*',

  // Files in this directory must match a pre-determined name in some cases.
  'x-pack/legacy/plugins/canvas/.storybook/*',

  // filename must match language code which requires capital letters
  '**/translations/*.json',
];

/**
 * These patterns are matched against directories and indicate
 * folders that must use kebab case.
 *
 * @type {Array}
 */
export const KEBAB_CASE_DIRECTORY_GLOBS = ['packages/*', 'x-pack'];

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
  '**/webpackShims',
  'src/babel-*',
  'packages/*',
  'packages/kbn-ui-framework/generator-kui',
  'src/legacy/ui/public/angular-bootstrap',
  'src/legacy/ui/public/flot-charts',
  'src/legacy/ui/public/utils/lodash-mixins',
  'test/functional/fixtures/es_archiver/visualize_source-filters',
  'packages/kbn-pm/src/utils/__fixtures__/*',
  'x-pack/dev-tools',
];

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
  'src/legacy/core_plugins/console/public/src/directives/helpExample.txt',
  'src/legacy/core_plugins/console/public/src/sense_editor/theme-sense-dark.js',
  'src/legacy/core_plugins/tests_bundle/webpackShims/angular-mocks.js',
  'src/legacy/core_plugins/tile_map/public/__tests__/scaledCircleMarkers.png',
  'src/legacy/core_plugins/tile_map/public/__tests__/shadedCircleMarkers.png',
  'src/legacy/core_plugins/tile_map/public/__tests__/shadedGeohashGrid.png',
  'src/legacy/core_plugins/timelion/server/lib/asSorted.js',
  'src/legacy/core_plugins/timelion/server/lib/unzipPairs.js',
  'src/legacy/core_plugins/timelion/server/series_functions/__tests__/fixtures/bucketList.js',
  'src/legacy/core_plugins/timelion/server/series_functions/__tests__/fixtures/seriesList.js',
  'src/legacy/core_plugins/timelion/server/series_functions/__tests__/fixtures/tlConfig.js',
  'src/fixtures/config_upgrade_from_4.0.0_to_4.0.1-snapshot.json',
  'src/fixtures/vislib/mock_data/terms/_seriesMultiple.js',
  'src/legacy/ui/public/angular-bootstrap/bindHtml/bindHtml.js',
  'src/legacy/ui/public/angular-bootstrap/tooltip/tooltip-html-unsafe-popup.html',
  'src/legacy/ui/public/angular-bootstrap/tooltip/tooltip-popup.html',
  'src/legacy/ui/public/assets/favicons/android-chrome-192x192.png',
  'src/legacy/ui/public/assets/favicons/android-chrome-256x256.png',
  'src/legacy/ui/public/assets/favicons/android-chrome-512x512.png',
  'src/legacy/ui/public/assets/favicons/apple-touch-icon.png',
  'src/legacy/ui/public/assets/favicons/favicon-16x16.png',
  'src/legacy/ui/public/assets/favicons/favicon-32x32.png',
  'src/legacy/ui/public/assets/favicons/mstile-70x70.png',
  'src/legacy/ui/public/assets/favicons/mstile-144x144.png',
  'src/legacy/ui/public/assets/favicons/mstile-150x150.png',
  'src/legacy/ui/public/assets/favicons/mstile-310x150.png',
  'src/legacy/ui/public/assets/favicons/mstile-310x310.png',
  'src/legacy/ui/public/assets/favicons/safari-pinned-tab.svg',
  'src/legacy/ui/public/styles/bootstrap/component-animations.less',
  'src/legacy/ui/public/styles/bootstrap/input-groups.less',
  'src/legacy/ui/public/styles/bootstrap/list-group.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/background-variant.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/border-radius.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/center-block.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/grid-framework.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/hide-text.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/list-group.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/nav-divider.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/nav-vertical-align.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/progress-bar.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/reset-filter.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/reset-text.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/responsive-visibility.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/tab-focus.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/table-row.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/text-emphasis.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/text-overflow.less',
  'src/legacy/ui/public/styles/bootstrap/mixins/vendor-prefixes.less',
  'src/legacy/ui/public/styles/bootstrap/progress-bars.less',
  'src/legacy/ui/public/styles/bootstrap/responsive-utilities.less',
  'test/functional/apps/management/exports/_import_objects-conflicts.json',
  'packages/kbn-ui-framework/doc_site/src/images/elastic-logo.svg',
  'packages/kbn-ui-framework/doc_site/src/images/hint-arrow.svg',
  'packages/kbn-ui-framework/doc_site/src/images/react-logo.svg',
  'webpackShims/elasticsearch-browser.js',
  'webpackShims/moment-timezone.js',
  'webpackShims/ui-bootstrap.js',
  'x-pack/legacy/plugins/graph/public/graphClientWorkspace.js',
  'x-pack/legacy/plugins/graph/public/angular-venn-simple.js',
  'x-pack/legacy/plugins/index_management/public/lib/editSettings.js',
  'x-pack/legacy/plugins/license_management/public/store/reducers/licenseManagement.js',
  'x-pack/legacy/plugins/monitoring/public/components/sparkline/__mocks__/plugins/xpack_main/jquery_flot.js',
  'x-pack/legacy/plugins/monitoring/public/icons/alert-blue.svg',
  'x-pack/legacy/plugins/monitoring/public/icons/health-gray.svg',
  'x-pack/legacy/plugins/monitoring/public/icons/health-green.svg',
  'x-pack/legacy/plugins/monitoring/public/icons/health-red.svg',
  'x-pack/legacy/plugins/monitoring/public/icons/health-yellow.svg',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/noto/NotoSansCJKtc-Medium.ttf',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/noto/NotoSansCJKtc-Regular.ttf',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Italic.ttf',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Medium.ttf',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Regular.ttf',
  'x-pack/legacy/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/img/logo-grey.png',
  'x-pack/test/functional/es_archives/monitoring/beats-with-restarted-instance/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/beats-with-restarted-instance/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/logstash-pipelines/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/logstash-pipelines/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/multi-basic/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/multi-basic/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-basic-beats/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-basic-beats/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-gold/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-gold/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-platinum/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-platinum/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-trial-two-nodes-one-cgrouped/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-green-trial-two-nodes-one-cgrouped/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-red-platinum/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-red-platinum/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-three-nodes-shard-relocation/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-three-nodes-shard-relocation/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-basic/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-basic/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-platinum--with-10-alerts/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-platinum--with-10-alerts/mappings.json',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-platinum/data.json.gz',
  'x-pack/test/functional/es_archives/monitoring/singlecluster-yellow-platinum/mappings.json',
];
