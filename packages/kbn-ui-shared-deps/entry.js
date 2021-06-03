/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('./polyfills');

// must load before angular
export const Jquery = require('jquery');
window.$ = window.jQuery = Jquery;
require('./flot_charts');

// stateful deps
export const KbnI18n = require('@kbn/i18n');
export const KbnI18nAngular = require('@kbn/i18n/angular');
export const KbnI18nReact = require('@kbn/i18n/react');
export const Angular = require('angular');
export const Moment = require('moment');
export const MomentTimezone = require('moment-timezone/moment-timezone');
export const KbnMonaco = require('@kbn/monaco');
export const MonacoBarePluginApi = require('@kbn/monaco').BarePluginApi;
export const React = require('react');
export const ReactDom = require('react-dom');
export const ReactDomServer = require('react-dom/server');
export const ReactRouter = require('react-router'); // eslint-disable-line
export const ReactRouterDom = require('react-router-dom');
export const StyledComponents = require('styled-components');

Moment.tz.load(require('moment-timezone/data/packed/latest.json'));

// big deps which are locked to a single version
export const Rxjs = require('rxjs');
export const RxjsOperators = require('rxjs/operators');
export const ElasticNumeral = require('@elastic/numeral');
export const ElasticCharts = require('@elastic/charts');
export const ElasticEui = require('@elastic/eui');
export const ElasticEuiLibServices = require('@elastic/eui/lib/services');
export const ElasticEuiLibServicesFormat = require('@elastic/eui/lib/services/format');
export const ElasticEuiChartsTheme = require('@elastic/eui/dist/eui_charts_theme');
export const Theme = require('./theme.ts');
export const Lodash = require('lodash');
export const LodashFp = require('lodash/fp');

export const Fflate = require('fflate/esm/browser');

// runtime deps which don't need to be copied across all bundles
export const TsLib = require('tslib');
export const KbnAnalytics = require('@kbn/analytics');
export const KbnStd = require('@kbn/std');
export const SaferLodashSet = require('@elastic/safer-lodash-set');
export const RisonNode = require('rison-node');
