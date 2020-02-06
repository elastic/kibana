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

// import global polyfills before everything else
require('./polyfills');

// must load before angular
export const Jquery = require('jquery');
window.$ = window.jQuery = Jquery;

export const Angular = require('angular');
export const ElasticCharts = require('@elastic/charts');
export const ElasticEui = require('@elastic/eui');
export const ElasticEuiLibServices = require('@elastic/eui/lib/services');
export const ElasticEuiLightTheme = require('@elastic/eui/dist/eui_theme_light.json');
export const ElasticEuiDarkTheme = require('@elastic/eui/dist/eui_theme_dark.json');
export const KbnI18n = require('@kbn/i18n');
export const KbnI18nAngular = require('@kbn/i18n/angular');
export const KbnI18nReact = require('@kbn/i18n/react');
export const Moment = require('moment');
export const MomentTimezone = require('moment-timezone/moment-timezone');
export const React = require('react');
export const ReactDom = require('react-dom');
export const ReactIntl = require('react-intl');
export const ReactRouter = require('react-router'); // eslint-disable-line
export const ReactRouterDom = require('react-router-dom');

// load timezone data into moment-timezone
Moment.tz.load(require('moment-timezone/data/packed/latest.json'));
