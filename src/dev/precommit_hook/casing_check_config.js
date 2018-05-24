
/**
 * These patterns are used to identifiy files that are not supposed
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
  '**/*.txt',
  '**/Gruntfile.js',
  'tasks/config/**/*',
  '**/{Dockerfile,docker-compose.yml}',
  'x-pack/plugins/apm/**/*',
  '**/.*',
  '**/{webpackShims,__mocks__}/**/*',
  'x-pack/docs/**/*',
  'src/dev/tslint/rules/*',

  // filename must match language code which requires capital letters
  'src/ui/ui_i18n/__tests__/fixtures/translations/test_plugin_1/es-ES.json',
];


/**
 * These patterns are matched against directories and indicate
 * folders that must use kebab case.
 *
 * @type {Array}
 */
export const KEBAB_CASE_DIRECTORY_GLOBS = [
  'packages/*',
  'x-pack',
];


/**
 * These patterns are matched against directories and indicate
 * explicit folders that are NOT supposed to use snake_case.
 *
 * When a file in one of these directories is checked, the directory
 * matched by these patterns is removed from the path before
 * the casing check so that the files casing is still checked. This
 * allows folders like `src/ui/public/flot-charts` to exist, which
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
  'src/ui/public/angular-bootstrap',
  'src/ui/public/flot-charts',
  'src/ui/public/utils/lodash-mixins',
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
  'src/core_plugins/console/public/src/directives/helpExample.txt',
  'src/core_plugins/console/public/src/sense_editor/theme-sense-dark.js',
  'src/core_plugins/console/public/tests/webpackShims/qunit-1.10.0.css',
  'src/core_plugins/console/public/tests/webpackShims/qunit-1.10.0.js',
  'src/core_plugins/console/public/webpackShims/ace/ext-language_tools.js',
  'src/core_plugins/console/public/webpackShims/ace/ext-searchbox.js',
  'src/core_plugins/console/public/webpackShims/ace/mode-json.js',
  'src/core_plugins/console/public/webpackShims/ace/mode-yaml.js',
  'src/core_plugins/console/public/webpackShims/ace/worker-json.js',
  'src/core_plugins/console/public/webpackShims/ui-bootstrap-custom.js',
  'src/core_plugins/input_control_vis/public/images/icon-input-control.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-area.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-donut.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-gauge.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-goal.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-heatmap.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-horizontal.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-line.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-number.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-pie.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-tilemap.svg',
  'src/core_plugins/kbn_vislib_vis_types/public/images/icon-vertical.svg',
  'src/core_plugins/kibana/public/assets/play-circle.svg',
  'src/core_plugins/markdown_vis/public/images/icon-markdown.svg',
  'src/core_plugins/metric_vis/public/images/icon-number.svg',
  'src/core_plugins/metrics/public/images/icon-visualbuilder.svg',
  'src/core_plugins/region_map/public/images/icon-vector-map.svg',
  'src/core_plugins/table_vis/public/images/icon-table.svg',
  'src/core_plugins/tagcloud/public/images/icon-tagcloud.svg',
  'src/core_plugins/tests_bundle/webpackShims/angular-mocks.js',
  'src/core_plugins/tile_map/public/__tests__/scaledCircleMarkers.png',
  'src/core_plugins/tile_map/public/__tests__/shadedCircleMarkers.png',
  'src/core_plugins/tile_map/public/__tests__/shadedGeohashGrid.png',
  'src/core_plugins/tile_map/public/images/icon-tilemap.svg',
  'src/core_plugins/timelion/public/images/icon-timelion.svg',
  'src/core_plugins/timelion/server/lib/asSorted.js',
  'src/core_plugins/timelion/server/lib/unzipPairs.js',
  'src/core_plugins/timelion/server/series_functions/__tests__/fixtures/bucketList.js',
  'src/core_plugins/timelion/server/series_functions/__tests__/fixtures/seriesList.js',
  'src/core_plugins/timelion/server/series_functions/__tests__/fixtures/tlConfig.js',
  'src/fixtures/config_upgrade_from_4.0.0_to_4.0.1-snapshot.json',
  'src/fixtures/vislib/mock_data/terms/_seriesMultiple.js',
  'src/ui/i18n/__tests__/fixtures/translations/test_plugin_1/es-ES.json',
  'src/ui/public/angular-bootstrap/accordion/accordion-group.html',
  'src/ui/public/angular-bootstrap/bindHtml/bindHtml.js',
  'src/ui/public/angular-bootstrap/tooltip/tooltip-html-unsafe-popup.html',
  'src/ui/public/angular-bootstrap/tooltip/tooltip-popup.html',
  'src/ui/public/angular-bootstrap/typeahead/typeahead-match.html',
  'src/ui/public/angular-bootstrap/typeahead/typeahead-popup.html',
  'src/ui/public/assets/favicons/android-chrome-192x192.png',
  'src/ui/public/assets/favicons/android-chrome-256x256.png',
  'src/ui/public/assets/favicons/apple-touch-icon.png',
  'src/ui/public/assets/favicons/favicon-16x16.png',
  'src/ui/public/assets/favicons/favicon-32x32.png',
  'src/ui/public/assets/favicons/mstile-150x150.png',
  'src/ui/public/assets/favicons/safari-pinned-tab.svg',
  'src/ui/public/directives/__tests__/confirm-click.js',
  'src/ui/public/dragula/gu-dragula.less',
  'src/ui/public/field_format_editor/editors/url/icons/flag-icon.LICENSE',
  'src/ui/public/icons/beats-color.svg',
  'src/ui/public/icons/beats-gray.svg',
  'src/ui/public/icons/elasticsearch-color.svg',
  'src/ui/public/icons/elasticsearch-gray.svg',
  'src/ui/public/icons/kibana-color.svg',
  'src/ui/public/icons/kibana-gray.svg',
  'src/ui/public/icons/logstash-color.svg',
  'src/ui/public/icons/logstash-gray.svg',
  'src/ui/public/icons/security-gray.svg',
  'src/ui/public/query_bar/lib/queryLanguages.js',
  'src/ui/public/styles/bootstrap/component-animations.less',
  'src/ui/public/styles/bootstrap/input-groups.less',
  'src/ui/public/styles/bootstrap/list-group.less',
  'src/ui/public/styles/bootstrap/mixins/background-variant.less',
  'src/ui/public/styles/bootstrap/mixins/border-radius.less',
  'src/ui/public/styles/bootstrap/mixins/center-block.less',
  'src/ui/public/styles/bootstrap/mixins/grid-framework.less',
  'src/ui/public/styles/bootstrap/mixins/hide-text.less',
  'src/ui/public/styles/bootstrap/mixins/list-group.less',
  'src/ui/public/styles/bootstrap/mixins/nav-divider.less',
  'src/ui/public/styles/bootstrap/mixins/nav-vertical-align.less',
  'src/ui/public/styles/bootstrap/mixins/progress-bar.less',
  'src/ui/public/styles/bootstrap/mixins/reset-filter.less',
  'src/ui/public/styles/bootstrap/mixins/reset-text.less',
  'src/ui/public/styles/bootstrap/mixins/responsive-visibility.less',
  'src/ui/public/styles/bootstrap/mixins/tab-focus.less',
  'src/ui/public/styles/bootstrap/mixins/table-row.less',
  'src/ui/public/styles/bootstrap/mixins/text-emphasis.less',
  'src/ui/public/styles/bootstrap/mixins/text-overflow.less',
  'src/ui/public/styles/bootstrap/mixins/vendor-prefixes.less',
  'src/ui/public/styles/bootstrap/progress-bars.less',
  'src/ui/public/styles/bootstrap/responsive-utilities.less',
  'src/ui/public/styles/dark-theme.less',
  'src/ui/public/styles/dark-variables.less',
  'src/ui/public/styles/fonts/glyphicons-halflings-regular.eot',
  'src/ui/public/styles/fonts/glyphicons-halflings-regular.svg',
  'src/ui/public/styles/fonts/glyphicons-halflings-regular.ttf',
  'src/ui/public/styles/fonts/glyphicons-halflings-regular.woff',
  'src/ui/public/styles/fonts/glyphicons-halflings-regular.woff2',
  'src/ui/public/styles/list-group-menu.less',
  'src/ui/public/styles/react-input-range.less',
  'src/ui/public/styles/react-select.less',
  'src/ui/public/styles/theme/font-awesome.less',
  'src/ui/public/styles/variables/bootstrap-mods.less',
  'src/ui/public/styles/variables/for-theme.less',
  'src/ui/public/typeahead/partials/typeahead-items.html',
  'src/ui/public/utils/migrateLegacyQuery.js',
  'test/functional/apps/management/exports/_import_objects-conflicts.json',
  'packages/kbn-ui-framework/doc_site/src/images/elastic-logo.svg',
  'packages/kbn-ui-framework/doc_site/src/images/hint-arrow.svg',
  'packages/kbn-ui-framework/doc_site/src/images/react-logo.svg',
  'webpackShims/angular-ui-select.js',
  'webpackShims/elasticsearch-browser.js',
  'webpackShims/moment-timezone.js',
  'webpackShims/ui-bootstrap.js',
  'x-pack/plugins/graph/public/graphClientWorkspace.js',
  'x-pack/plugins/graph/public/angular-venn-simple.js',
  'x-pack/plugins/index_management/public/lib/editSettings.js',
  'x-pack/plugins/license_management/public/store/reducers/licenseManagement.js',
  'x-pack/plugins/ml/server/client/__tests__/elasticsearch-ml.js',
  'x-pack/plugins/ml/server/client/elasticsearch-ml.js',
  'x-pack/plugins/monitoring/public/components/sparkline/__mocks__/jquery-flot.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/components/clusterView.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/components/tableBody.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/components/tableHead.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/directives/clusterView.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/__tests__/decorateShards.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/calculateClass.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/decorateShards.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/generateQueryAndLink.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/hasPrimaryChildren.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/lib/hasUnassigned.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/transformers/indicesByNodes.js',
  'x-pack/plugins/monitoring/public/directives/elasticsearch/shard_allocation/transformers/nodesByIndices.js',
  'x-pack/server/lib/elasticsearch-shield-js/elasticsearch-shield.js',
  'x-pack/server/lib/elasticsearch-shield-js/generate/Method.js',
  'x-pack/server/lib/elasticsearch-shield-js/generate/ParamList.js',
  'x-pack/server/lib/elasticsearch-shield-js/generate/index.js',
  'x-pack/server/lib/elasticsearch-shield-js/generate/templateHelpers.js',
  'x-pack/server/lib/elasticsearch-shield-js/test/Catcher.js',
  'x-pack/server/lib/elasticsearch-shield-js/test/YamlDoc.js',
  'x-pack/server/lib/elasticsearch-shield-js/test/YamlFile.js',
  'x-pack/server/lib/elasticsearch-shield-js/test/client.js',
  'x-pack/server/lib/elasticsearch-shield-js/test/read.js',
  'x-pack/test/api_integration/apis/monitoring/elasticsearch/nodes-listing.js',
  'x-pack/plugins/ml/public/jobs/new_job/simple/components/watcher/email-influencers.html',
  'x-pack/plugins/ml/public/styles/ui-select.less',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/dashboard/ML-Apache2-Access-Remote-IP-Count-Explorer.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/dashboard/ML-Apache2-Remote-IP-URL-Explorer.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/search/ML-Filebeat-Apache2-Access.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Map.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Remote-IP-Timechart.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Response-Code-Timechart.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Top-Remote-IPs-Table.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Top-URLs-Table.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/apache2/kibana/visualization/ML-Apache2-Access-Unique-Count-URL-Timechart.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/dashboard/ML-Nginx-Access-Remote-IP-Count-Explorer.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/dashboard/ML-Nginx-Remote-IP-URL-Explorer.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/search/ML-Filebeat-Nginx-Access.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Map.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Remote-IP-Timechart.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Response-Code-Timechart.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Top-Remote-IPs-Table.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Top-URLs-Table.json',
  'x-pack/plugins/ml/server/models/data_recognizer/modules/nginx/kibana/visualization/ML-Nginx-Access-Unique-Count-URL-Timechart.json',
  'x-pack/plugins/monitoring/public/icons/alert-blue.svg',
  'x-pack/plugins/monitoring/public/icons/health-gray.svg',
  'x-pack/plugins/monitoring/public/icons/health-green.svg',
  'x-pack/plugins/monitoring/public/icons/health-red.svg',
  'x-pack/plugins/monitoring/public/icons/health-yellow.svg',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/noto/NotoSansCJKtc-Medium.ttf',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/noto/NotoSansCJKtc-Regular.ttf',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Italic.ttf',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Medium.ttf',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/fonts/roboto/Roboto-Regular.ttf',
  'x-pack/plugins/reporting/export_types/printable_pdf/server/lib/pdf/assets/img/logo-grey.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/2x1-checkerboard.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/2x2-black.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/2x2-checkerboard.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/2x2-white.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/4x4-checkerboard.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/single-black-pixel.png',
  'x-pack/plugins/reporting/server/browsers/chromium/driver/screenshot_stitcher/fixtures/single-white-pixel.png',
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
