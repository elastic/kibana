/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('./polyfills');
// Optional prototype hardening. This must occur immediately after polyfills.
if (typeof window.__kbnHardenPrototypes__ !== 'boolean') {
  throw new Error(
    'Invariant bootstrap failure: __kbnHardenPrototypes__ must be set to true or false'
  );
}
if (window.__kbnHardenPrototypes__) {
  require('@kbn/security-hardening/prototype');
}

export const Jquery = require('jquery');
window.$ = window.jQuery = Jquery;

// stateful deps
export const KbnUiTheme = require('@kbn/ui-theme');
export const KbnI18n = require('@kbn/i18n');
export const KbnI18nReact = require('@kbn/i18n-react');
export const EmotionCache = require('@emotion/cache');
export const EmotionReact = require('@emotion/react');
export const Moment = require('moment');
export const MomentTimezone = require('moment-timezone/moment-timezone');

export const IoTs = require('io-ts');
export const KbnMonaco = require('@kbn/monaco');
export const MonacoBarePluginApi = require('@kbn/monaco').BarePluginApi;
export const React = require('react');
export const ReactDom = require('react-dom');
export const ReactDomServer = require('react-dom/server');
// eslint-disable-next-line @kbn/eslint/module_migration
export const ReactRouter = require('react-router');
export const ReactRouterDom = require('react-router-dom');
export const ReactRouterDomV5Compat = require('react-router-dom-v5-compat');
// eslint-disable-next-line @kbn/eslint/module_migration
export const StyledComponents = require('styled-components');
export const FastestLevenshtein = require('fastest-levenshtein');

Moment.tz.load(require('moment-timezone/data/packed/latest.json'));

// big deps which are locked to a single version
export const Rxjs = require('rxjs');
export const ElasticNumeral = require('@elastic/numeral');
export const ElasticCharts = require('@elastic/charts');
export const ElasticEui = require('@elastic/eui');
export const ElasticEuiLibComponentsUseIsNestedEuiProvider = require('@elastic/eui/optimize/es/components/provider/nested');
export const ElasticEuiLibServicesThemeWarning = require('@elastic/eui/optimize/es/services/theme/warning');
export const ElasticEuiThemeBorealis = require('@elastic/eui-theme-borealis');
export const KbnDatemath = require('@kbn/datemath');
export const HelloPangeaDnd = require('@hello-pangea/dnd/dist/dnd');
export const ReduxjsToolkit = require('@reduxjs/toolkit');
export const ReactRedux = require('react-redux');
export const Redux = require('redux');
export const Immer = require('immer');
export const Reselect = require('reselect');

export const Lodash = require('lodash');
export const LodashFp = require('lodash/fp');

const { unzlibSync, strFromU8 } = require('fflate');
export const Fflate = { unzlibSync, strFromU8 };

// runtime deps which don't need to be copied across all bundles
export const TsLib = require('tslib');
export const Uuid = require('uuid');
export const KbnAnalytics = require('@kbn/analytics');
export const KbnCryptoBrowser = require('@kbn/crypto-browser');
export const KbnEsQuery = require('@kbn/es-query');
export const KbnSearchErrors = require('@kbn/search-errors');
export const KbnStd = require('@kbn/std');
export const SaferLodashSet = require('@kbn/safer-lodash-set');

export const KbnSharedUxErrorBoundary = require('@kbn/shared-ux-error-boundary');
export const KbnRison = require('@kbn/rison');
export const History = require('history');
export const Classnames = require('classnames');
export const ReactQuery = require('@tanstack/react-query');
export const ReactQueryDevtools = require('@tanstack/react-query-devtools');
export const KbnCodeEditor = require('@kbn/code-editor');
export const KbnEsqlAst = require('@kbn/esql-ast');
export const KbnEbtTools = require('@kbn/ebt-tools');
export const ElasticApmRumCore = require('@elastic/apm-rum-core');
export const KbnReactKibanaContextCommon = require('@kbn/react-kibana-context-common');
export const KbnReactKibanaContextRoot = require('@kbn/react-kibana-context-root');
export const KbnReactKibanaContextRender = require('@kbn/react-kibana-context-render');
export const KbnReactKibanaContextTheme = require('@kbn/react-kibana-context-theme');
export const KbnSharedUxRouter = require('@kbn/shared-ux-router');
