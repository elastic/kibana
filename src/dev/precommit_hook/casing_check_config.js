
/**
 * These patterns are used to identifiy files that are not supposed
 * to be snake_case because their names are determined by other
 * systems or rules.
 *
 * @type {Array}
 */
export const IGNORE_FILE_GLOBS = [
  '.node-version',
  'docs/**/*',
  'bin/**/*',
  '**/+([A-Z_]).md',
  '**/*.txt',
  'Gruntfile.js',
  'tasks/config/**/*',
  'tasks/build/docker/docs/{Dockerfile,docker-compose.yml}',
];


/**
 * These patterns are matched against directories and indicate
 * folders that must use kebab case.
 *
 * @type {Array}
 */
export const KEBAB_CASE_DIRECTORY_GLOBS = [
  'packages/*',
];


/**
 * These patterns are matched against directories and indicate
 * explicit folders that are NOT supposed to use snake_case.
 *
 * When a file in one of these directories is checked, the directory
 * matched by these patterns is removed from the path before
 * the casing check so that the files casing is still checked. This
 * allows folders like `ui_framework/generator-kui` to exist, which
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
  'ui_framework/generator-kui',
  'src/ui/public/angular-bootstrap',
  'src/ui/public/flot-charts',
  'src/ui/public/utils/lodash-mixins',
  'test/functional/fixtures/es_archiver/visualize_source-filters',
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
  'ui_framework/doc_site/src/images/elastic-logo.svg',
  'ui_framework/doc_site/src/images/hint-arrow.svg',
  'ui_framework/doc_site/src/images/react-logo.svg',
  'webpackShims/angular-ui-select.js',
  'webpackShims/elasticsearch-browser.js',
  'webpackShims/moment-timezone.js',
  'webpackShims/ui-bootstrap.js',
];
