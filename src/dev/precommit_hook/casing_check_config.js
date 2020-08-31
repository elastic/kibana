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
  '**/+([A-Z_]).asciidoc',
  '**/LICENSE',
  '**/*.txt',
  '**/Gruntfile.js',
  'tasks/config/**/*',
  '**/{Dockerfile,docker-compose.yml}',
  'x-pack/plugins/canvas/tasks/**/*',
  'x-pack/plugins/canvas/canvas_plugin_src/**/*',
  'x-pack/plugins/monitoring/public/lib/jquery_flot/**/*',
  '**/.*',
  '**/__mocks__/**/*',
  'x-pack/docs/**/*',
  'src/core/server/core_app/assets/fonts/**/*',
  'src/dev/code_coverage/ingest_coverage/integration_tests/mocks/**/*',
  'packages/kbn-utility-types/test-d/**/*',
  '**/Jenkinsfile*',
  'Dockerfile*',
  'vars/*',
  '.ci/pipeline-library/**/*',

  // Files in this directory must match a pre-determined name in some cases.
  'x-pack/plugins/canvas/storybook/*',

  // filename must match language code which requires capital letters
  '**/translations/*.json',

  // filename is required by storybook
  'packages/kbn-storybook/storybook_config/preview-head.html',

  // filename required by api-extractor
  'api-documenter.json',

  // filename must match upstream filenames from lodash
  'packages/elastic-safer-lodash-set/**/*',

  // TODO fix file names in APM to remove these
  'x-pack/plugins/apm/public/**/*',
  'x-pack/plugins/apm/scripts/**/*',
  'x-pack/plugins/apm/e2e/**/*',

  'x-pack/plugins/maps/server/fonts/**/*',

  // packages for the ingest manager's api integration tests could be valid semver which has dashes
  'x-pack/test/ingest_manager_api_integration/apis/fixtures/test_packages/**/*',

  '.teamcity/**/*',
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
  'src/babel-*',
  'packages/*',
  'packages/kbn-ui-framework/generator-kui',
  'src/legacy/ui/public/flot-charts',
  'test/functional/fixtures/es_archiver/visualize_source-filters',
  'packages/kbn-pm/src/utils/__fixtures__/*',
  'x-pack/dev-tools',
  'packages/kbn-optimizer/src/__fixtures__/mock_repo/x-pack',
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
  'src/legacy/core_plugins/console/public/src/directives/helpExample.txt',
  'src/legacy/core_plugins/console/public/src/sense_editor/theme-sense-dark.js',
  'src/legacy/core_plugins/tile_map/public/__tests__/scaledCircleMarkers.png',
  'src/legacy/core_plugins/tile_map/public/__tests__/shadedCircleMarkers.png',
  'src/legacy/core_plugins/tile_map/public/__tests__/shadedGeohashGrid.png',
  'src/fixtures/config_upgrade_from_4.0.0_to_4.0.1-snapshot.json',
  'src/core/server/core_app/assets/favicons/android-chrome-192x192.png',
  'src/core/server/core_app/assets/favicons/android-chrome-256x256.png',
  'src/core/server/core_app/assets/favicons/android-chrome-512x512.png',
  'src/core/server/core_app/assets/favicons/apple-touch-icon.png',
  'src/core/server/core_app/assets/favicons/favicon-16x16.png',
  'src/core/server/core_app/assets/favicons/favicon-32x32.png',
  'src/core/server/core_app/assets/favicons/mstile-70x70.png',
  'src/core/server/core_app/assets/favicons/mstile-144x144.png',
  'src/core/server/core_app/assets/favicons/mstile-150x150.png',
  'src/core/server/core_app/assets/favicons/mstile-310x150.png',
  'src/core/server/core_app/assets/favicons/mstile-310x310.png',
  'src/core/server/core_app/assets/favicons/safari-pinned-tab.svg',
  'test/functional/apps/management/exports/_import_objects-conflicts.json',
  'packages/kbn-ui-framework/doc_site/src/images/elastic-logo.svg',
  'packages/kbn-ui-framework/doc_site/src/images/hint-arrow.svg',
  'packages/kbn-ui-framework/doc_site/src/images/react-logo.svg',
  'x-pack/legacy/plugins/index_management/public/lib/editSettings.js',
  'x-pack/legacy/plugins/license_management/public/store/reducers/licenseManagement.js',
  'x-pack/plugins/monitoring/public/components/sparkline/__mocks__/plugins/xpack_main/jquery_flot.js',
  'x-pack/plugins/monitoring/public/icons/health-gray.svg',
  'x-pack/plugins/monitoring/public/icons/health-green.svg',
  'x-pack/plugins/monitoring/public/icons/health-red.svg',
  'x-pack/plugins/monitoring/public/icons/health-yellow.svg',
  'x-pack/plugins/reporting/server/export_types/common/assets/fonts/noto/NotoSansCJKtc-Medium.ttf',
  'x-pack/plugins/reporting/server/export_types/common/assets/fonts/noto/NotoSansCJKtc-Regular.ttf',
  'x-pack/plugins/reporting/server/export_types/common/assets/fonts/roboto/Roboto-Italic.ttf',
  'x-pack/plugins/reporting/server/export_types/common/assets/fonts/roboto/Roboto-Medium.ttf',
  'x-pack/plugins/reporting/server/export_types/common/assets/fonts/roboto/Roboto-Regular.ttf',
  'x-pack/plugins/reporting/server/export_types/common/assets/img/logo-grey.png',
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
