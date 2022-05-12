/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

// extracted const vars
/**
 * Absolute path to the distributable directory
 */
const distDir = Path.resolve(__dirname, '../shared_built_assets');

/**
 * Filename of the main bundle file in the distributable directory
 */
const jsFilename = 'kbn-ui-shared-deps-src.js';

/**
 * Filename of the main bundle file in the distributable directory
 */
const cssDistFilename = 'kbn-ui-shared-deps-src.css';

/**
 * Externals mapping inteded to be used in a webpack config
 */
const externals = {
  /**
   * stateful deps
   */
  '@kbn/ui-theme': '__kbnSharedDeps__.KbnUiTheme',
  '@kbn/i18n': '__kbnSharedDeps__.KbnI18n',
  '@kbn/i18n-react': '__kbnSharedDeps__.KbnI18nReact',
  '@emotion/react': '__kbnSharedDeps__.EmotionReact',
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
  '@kbn/datemath': '__kbnSharedDeps__.KbnDatemath',
  '@elastic/eui': '__kbnSharedDeps__.ElasticEui',
  '@elastic/eui/lib/services': '__kbnSharedDeps__.ElasticEuiLibServices',
  '@elastic/eui/lib/services/format': '__kbnSharedDeps__.ElasticEuiLibServicesFormat',
  '@elastic/eui/dist/eui_charts_theme': '__kbnSharedDeps__.ElasticEuiChartsTheme',

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
  history: '__kbnSharedDeps__.History',
  classnames: '__kbnSharedDeps__.Classnames',
};

module.exports = { distDir, jsFilename, cssDistFilename, externals };
