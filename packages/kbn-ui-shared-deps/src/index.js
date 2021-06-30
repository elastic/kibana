/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

/**
 * Absolute path to the distributable directory
 */
exports.distDir = Path.resolve(__dirname, '..', 'shared_built_assets');

/**
 * Filename of files that must be loaded before the jsFilename
 */
exports.jsDepFilenames = ['kbn-ui-shared-deps.@elastic.js'];

/**
 * Filename of the main bundle file in the distributable directory
 */
exports.jsFilename = 'kbn-ui-shared-deps.js';

/**
 * Filename of the unthemed css file in the distributable directory
 */
exports.baseCssDistFilename = 'kbn-ui-shared-deps.css';

/**
 * Filename of the light-theme css file in the distributable directory
 */
exports.lightCssDistFilename = 'kbn-ui-shared-deps.v7.light.css';

/**
 * Filename of the light-theme css file in the distributable directory
 */
exports.lightV8CssDistFilename = 'kbn-ui-shared-deps.v8.light.css';

/**
 * Filename of the dark-theme css file in the distributable directory
 */
exports.darkCssDistFilename = 'kbn-ui-shared-deps.v7.dark.css';

/**
 * Filename of the dark-theme css file in the distributable directory
 */
exports.darkV8CssDistFilename = 'kbn-ui-shared-deps.v8.dark.css';

/**
 * Externals mapping inteded to be used in a webpack config
 */
exports.externals = {
  // stateful deps
  angular: '__kbnSharedDeps__.Angular',
  '@kbn/i18n': '__kbnSharedDeps__.KbnI18n',
  '@kbn/i18n/angular': '__kbnSharedDeps__.KbnI18nAngular',
  '@kbn/i18n/react': '__kbnSharedDeps__.KbnI18nReact',
  jquery: '__kbnSharedDeps__.Jquery',
  moment: '__kbnSharedDeps__.Moment',
  'moment-timezone': '__kbnSharedDeps__.MomentTimezone',
  react: '__kbnSharedDeps__.React',
  'react-dom': '__kbnSharedDeps__.ReactDom',
  'react-dom/server': '__kbnSharedDeps__.ReactDomServer',
  'react-router': '__kbnSharedDeps__.ReactRouter',
  'react-router-dom': '__kbnSharedDeps__.ReactRouterDom',
  'styled-components': '__kbnSharedDeps__.StyledComponents',
  '@kbn/monaco': '__kbnSharedDeps__.KbnMonaco',
  '@kbn/ui-shared-deps/theme': '__kbnSharedDeps__.Theme',
  // this is how plugins/consumers from npm load monaco
  'monaco-editor/esm/vs/editor/editor.api': '__kbnSharedDeps__.MonacoBarePluginApi',

  /**
   * big deps which are locked to a single version
   */
  rxjs: '__kbnSharedDeps__.Rxjs',
  'rxjs/operators': '__kbnSharedDeps__.RxjsOperators',
  numeral: '__kbnSharedDeps__.ElasticNumeral',
  '@elastic/numeral': '__kbnSharedDeps__.ElasticNumeral',
  '@elastic/charts': '__kbnSharedDeps__.ElasticCharts',
  '@elastic/eui': '__kbnSharedDeps__.ElasticEui',
  '@elastic/eui/lib/services': '__kbnSharedDeps__.ElasticEuiLibServices',
  '@elastic/eui/lib/services/format': '__kbnSharedDeps__.ElasticEuiLibServicesFormat',
  '@elastic/eui/dist/eui_charts_theme': '__kbnSharedDeps__.ElasticEuiChartsTheme',
  '@elastic/eui/dist/eui_theme_light.json': '__kbnSharedDeps__.Theme.euiLightVars',
  '@elastic/eui/dist/eui_theme_dark.json': '__kbnSharedDeps__.Theme.euiDarkVars',
  // transient dep of eui
  'react-beautiful-dnd': '__kbnSharedDeps__.ReactBeautifulDnD',
  lodash: '__kbnSharedDeps__.Lodash',
  'lodash/fp': '__kbnSharedDeps__.LodashFp',
  fflate: '__kbnSharedDeps__.Fflate',

  /**
   * runtime deps which don't need to be copied across all bundles
   */
  tslib: '__kbnSharedDeps__.TsLib',
  '@kbn/analytics': '__kbnSharedDeps__.KbnAnalytics',
  '@kbn/std': '__kbnSharedDeps__.KbnStd',
  '@elastic/safer-lodash-set': '__kbnSharedDeps__.SaferLodashSet',
  'rison-node': '__kbnSharedDeps__.RisonNode',
};

/**
 * Webpack loader for configuring the public path lookup from `window.__kbnPublicPath__`.
 */
exports.publicPathLoader = require.resolve('./public_path_loader');
