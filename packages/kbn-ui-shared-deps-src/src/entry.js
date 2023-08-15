/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('./polyfills');

export const Jquery = require('jquery');
window.$ = window.jQuery = Jquery;
// mutates window.jQuery and window.$
require('@kbn/flot-charts');

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
export const StyledComponents = require('styled-components');

Moment.tz.load(require('moment-timezone/data/packed/latest.json'));

// big deps which are locked to a single version
export const Rxjs = require('rxjs');
export const RxjsOperators = require('rxjs/operators');
export const ElasticNumeral = require('@elastic/numeral');
export const ElasticCharts = require('@elastic/charts');
export const ElasticEui = require('@elastic/eui');
export const ElasticEuiLibServices = require('@elastic/eui/optimize/es/services');
export const ElasticEuiLibServicesFormat = require('@elastic/eui/optimize/es/services/format');
export const ElasticEuiChartsTheme = require('@elastic/eui/dist/eui_charts_theme');
export const KbnDatemath = require('@kbn/datemath');
export const HelloPangeaDnd = require('@hello-pangea/dnd/dist/dnd');

export const Lodash = require('lodash');
export const LodashFp = require('lodash/fp');

const { unzlibSync, strFromU8 } = require('fflate');
export const Fflate = { unzlibSync, strFromU8 };

// runtime deps which don't need to be copied across all bundles
export const TsLib = require('tslib');
export const Uuid = require('uuid');
export const KbnAnalytics = require('@kbn/analytics');
export const KbnEsQuery = require('@kbn/es-query');
export const KbnStd = require('@kbn/std');
export const SaferLodashSet = require('@kbn/safer-lodash-set');
export const KbnRison = require('@kbn/rison');
export const History = require('history');
export const Classnames = require('classnames');
export const ReactQuery = require('@tanstack/react-query');
export const ReactQueryDevtools = require('@tanstack/react-query-devtools');
