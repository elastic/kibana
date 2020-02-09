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

const Path = require('path');

exports.distDir = Path.resolve(__dirname, 'target');
exports.distFilename = 'kbn-ui-shared-deps.js';
exports.lightCssDistFilename = 'kbn-ui-shared-deps.light.css';
exports.darkCssDistFilename = 'kbn-ui-shared-deps.dark.css';
exports.externals = {
  angular: '__kbnSharedDeps__.Angular',
  '@elastic/charts': '__kbnSharedDeps__.ElasticCharts',
  '@elastic/eui': '__kbnSharedDeps__.ElasticEui',
  '@elastic/eui/lib/services': '__kbnSharedDeps__.ElasticEuiLibServices',
  '@elastic/eui/dist/eui_theme_light.json': '__kbnSharedDeps__.ElasticEuiLightTheme',
  '@elastic/eui/dist/eui_theme_dark.json': '__kbnSharedDeps__.ElasticEuiDarkTheme',
  '@kbn/i18n': '__kbnSharedDeps__.KbnI18n',
  '@kbn/i18n/angular': '__kbnSharedDeps__.KbnI18nAngular',
  '@kbn/i18n/react': '__kbnSharedDeps__.KbnI18nReact',
  jquery: '__kbnSharedDeps__.Jquery',
  moment: '__kbnSharedDeps__.Moment',
  'moment-timezone': '__kbnSharedDeps__.MomentTimezone',
  react: '__kbnSharedDeps__.React',
  'react-dom': '__kbnSharedDeps__.ReactDom',
  'react-intl': '__kbnSharedDeps__.ReactIntl',
  'react-router': '__kbnSharedDeps__.ReactRouter',
  'react-router-dom': '__kbnSharedDeps__.ReactRouterDom',
};
