/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const Fs = require('fs');

const { REPO_ROOT } = require('@kbn/repo-info');

const localDist = Path.resolve(__dirname, '../shared_built_assets');
const builtDist = Path.resolve(REPO_ROOT, 'target', 'build', Path.relative(REPO_ROOT, localDist));

// extracted const vars
/**
 * Absolute path to the distributable directory
 */
const distDir = Fs.existsSync(localDist) ? localDist : builtDist;

/**
 * Filename of the main bundle file in the distributable directory
 */
const jsFilename = 'kbn-ui-shared-deps-src.js';

/**
 * Filename of the main bundle file in the distributable directory
 */
const cssDistFilename = 'kbn-ui-shared-deps-src.css';

/**
 * Externals mapping intended to be used in a webpack config
 */
const externals = {
  /**
   * stateful deps
   */
  '@kbn/ui-theme': '__kbnSharedDeps__.KbnUiTheme',
  '@kbn/i18n': '__kbnSharedDeps__.KbnI18n',
  '@kbn/i18n-react': '__kbnSharedDeps__.KbnI18nReact',
  '@emotion/cache': '__kbnSharedDeps__.EmotionCache',
  '@emotion/react': '__kbnSharedDeps__.EmotionReact',
  jquery: '__kbnSharedDeps__.Jquery',
  moment: '__kbnSharedDeps__.Moment',
  'moment-timezone': '__kbnSharedDeps__.MomentTimezone',
  react: '__kbnSharedDeps__.React',
  'react-dom': '__kbnSharedDeps__.ReactDom',
  'react-dom/server': '__kbnSharedDeps__.ReactDomServer',
  'react-router': '__kbnSharedDeps__.ReactRouter',
  'react-router-dom': '__kbnSharedDeps__.ReactRouterDom',
  'react-router-dom-v5-compat': '__kbnSharedDeps__.ReactRouterDomV5Compat',
  'react-use': '__kbnSharedDeps__.ReactUse',
  'styled-components': '__kbnSharedDeps__.StyledComponents',
  '@kbn/monaco': '__kbnSharedDeps__.KbnMonaco',
  // this is how plugins/consumers from npm load monaco
  'monaco-editor/esm/vs/editor/editor.api': '__kbnSharedDeps__.MonacoBarePluginApi',
  'fp-ts/Option': '__kbnSharedDeps__.FpTs.option',
  'fp-ts/pipeable': '__kbnSharedDeps__.FpTs.pipeable',
  'fp-ts/TaskEither': '__kbnSharedDeps__.FpTs.taskEither',
  'fp-ts/Either': '__kbnSharedDeps__.FpTs.either',
  'fp-ts/function': '__kbnSharedDeps__.FpTs.function',
  'fp-ts/Task': '__kbnSharedDeps__.FpTs.task',
  'fp-ts/Set': '__kbnSharedDeps__.FpTs.set',
  'fp-ts/Ord': '__kbnSharedDeps__.FpTs.ord',
  'fp-ts/Array': '__kbnSharedDeps__.FpTs.array',
  'io-ts': '__kbnSharedDeps__.IoTs',
  'io-ts/lib/Reporter': '__kbnSharedDeps__.IoTsReporter',
  'io-ts/lib/PathReporter': '__kbnSharedDeps__.IoTsPathReporter',
  'io-ts/lib/ThrowReporter': '__kbnSharedDeps__.IoTsThrowReporter',
  '@reduxjs/toolkit': '__kbnSharedDeps__.ReduxjsToolkit',
  'react-redux': '__kbnSharedDeps__.ReactRedux',
  redux: '__kbnSharedDeps__.Redux',
  immer: '__kbnSharedDeps__.Immer',
  reselect: '__kbnSharedDeps__.Reselect',
  'fastest-levenshtein': '__kbnSharedDeps__.FastestLevenshtein',
  'chroma-js': '__kbnSharedDeps__.ChromaJs',
  // cache some used methods of the react-use library
  ...[
    'useAsync',
    'useAsyncFn',
    'useDebounce',
    'useDeepCompareEffect',
    'useEffectOnce',
    'useEvent',
    'useLatest',
    'useList',
    'useLocalStorage',
    'useMount',
    'useMountedState',
    'usePrevious',
    'useSessionStorage',
    'useTimeoutFn',
    'useToggle',
    'useUnmount',
    'useUpdateEffect',
    'useObservable',
  ].reduce((memo, subset) => {
    memo[`react-use/lib/${subset}`] = `__kbnSharedDeps__.ReactUse.${subset}`;
    return memo;
  }, {}),

  /**
   * big deps which are locked to a single version
   */
  rxjs: '__kbnSharedDeps__.Rxjs',
  numeral: '__kbnSharedDeps__.ElasticNumeral',
  '@elastic/numeral': '__kbnSharedDeps__.ElasticNumeral',
  '@elastic/charts': '__kbnSharedDeps__.ElasticCharts',
  '@kbn/datemath': '__kbnSharedDeps__.KbnDatemath',
  '@elastic/eui': '__kbnSharedDeps__.ElasticEui',
  '@elastic/eui/lib/components/provider/nested':
    '__kbnSharedDeps__.ElasticEuiLibComponentsUseIsNestedEuiProvider',
  '@elastic/eui/lib/services/theme/warning': '__kbnSharedDeps__.ElasticEuiLibServicesThemeWarning',
  '@elastic/eui-theme-borealis': '__kbnSharedDeps__.ElasticEuiThemeBorealis',

  // transient dep of eui
  '@hello-pangea/dnd': '__kbnSharedDeps__.HelloPangeaDnd',
  lodash: '__kbnSharedDeps__.Lodash',
  'lodash/fp': '__kbnSharedDeps__.LodashFp',
  /**
   * runtime deps which don't need to be copied across all bundles
   */
  tslib: '__kbnSharedDeps__.TsLib',
  uuid: '__kbnSharedDeps__.Uuid',
  '@kbn/analytics': '__kbnSharedDeps__.KbnAnalytics',
  '@kbn/crypto-browser': '__kbnSharedDeps__.KbnCryptoBrowser',
  '@kbn/es-query': '__kbnSharedDeps__.KbnEsQuery',
  '@kbn/search-errors': '__kbnSharedDeps__.KbnSearchErrors',
  '@kbn/std': '__kbnSharedDeps__.KbnStd',
  '@kbn/safer-lodash-set': '__kbnSharedDeps__.SaferLodashSet',
  '@kbn/shared-ux-error-boundary': '__kbnSharedDeps__.KbnSharedUxErrorBoundary',
  '@kbn/rison': '__kbnSharedDeps__.KbnRison',
  history: '__kbnSharedDeps__.History',
  classnames: '__kbnSharedDeps__.Classnames',
  '@kbn/react-query': '__kbnSharedDeps__.ReactQuery',
  '@tanstack/react-query-devtools': '__kbnSharedDeps__.ReactQueryDevtools',
  '@kbn/code-editor': '__kbnSharedDeps__.KbnCodeEditor',
  '@kbn/esql-language': '__kbnSharedDeps__.KbnEsqlAst',
  '@kbn/ebt-tools': '__kbnSharedDeps__.KbnEbtTools',
  '@elastic/apm-rum-core': '__kbnSharedDeps__.ElasticApmRumCore',
  '@kbn/react-kibana-context-common': '__kbnSharedDeps__.KbnReactKibanaContextCommon',
  '@kbn/react-kibana-context-root': '__kbnSharedDeps__.KbnReactKibanaContextRoot',
  '@kbn/react-kibana-context-render': '__kbnSharedDeps__.KbnReactKibanaContextRender',
  '@kbn/react-kibana-context-theme': '__kbnSharedDeps__.KbnReactKibanaContextTheme',
  '@kbn/react-kibana-context-env': '__kbnSharedDeps__.KbnReactKibanaContextEnv',
  '@kbn/shared-ux-router': '__kbnSharedDeps__.KbnSharedUxRouter',
  '@kbn/react-kibana-mount': '__kbnSharedDeps__.KbnReactKibanaMount',
  '@kbn/visualizations-common': '__kbnSharedDeps__.KbnVisualizationsCommon',
  '@kbn/core-chrome-sidebar-context': '__kbnSharedDeps__.KbnCoreSidebarContext',
};

module.exports = { distDir, jsFilename, cssDistFilename, externals };
