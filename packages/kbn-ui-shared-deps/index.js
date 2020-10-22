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
exports.jsDepFilenames = ['kbn-ui-shared-deps.@elastic.js'];
exports.jsFilename = 'kbn-ui-shared-deps.js';
exports.baseCssDistFilename = 'kbn-ui-shared-deps.css';
exports.lightCssDistFilename = 'kbn-ui-shared-deps.v7.light.css';
exports.lightV8CssDistFilename = 'kbn-ui-shared-deps.v8.light.css';
exports.darkCssDistFilename = 'kbn-ui-shared-deps.v7.dark.css';
exports.darkV8CssDistFilename = 'kbn-ui-shared-deps.v8.dark.css';
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
  lodash: '__kbnSharedDeps__.Lodash',
  'lodash/fp': '__kbnSharedDeps__.LodashFp',

  /**
   * runtime deps which don't need to be copied across all bundles
   */
  tslib: '__kbnSharedDeps__.TsLib',
  '@babel/runtime/helpers/assertThisInitialized':
    '__kbnSharedDeps.BabelRuntime.assertThisInitialized',
  '@babel/runtime/helpers/asyncToGenerator': '__kbnSharedDeps.BabelRuntime.asyncToGenerator',
  '@babel/runtime/helpers/classCallCheck': '__kbnSharedDeps.BabelRuntime.classCallCheck',
  '@babel/runtime/helpers/construct': '__kbnSharedDeps.BabelRuntime.construct',
  '@babel/runtime/helpers/createClass': '__kbnSharedDeps.BabelRuntime.createClass',
  '@babel/runtime/helpers/createForOfIteratorHelper':
    '__kbnSharedDeps.BabelRuntime.createForOfIteratorHelper',
  '@babel/runtime/helpers/createSuper': '__kbnSharedDeps.BabelRuntime.createSuper',
  '@babel/runtime/helpers/defineProperty': '__kbnSharedDeps.BabelRuntime.defineProperty',
  '@babel/runtime/helpers/extends': '__kbnSharedDeps.BabelRuntime.extends',
  '@babel/runtime/helpers/get': '__kbnSharedDeps.BabelRuntime.get',
  '@babel/runtime/helpers/getPrototypeOf': '__kbnSharedDeps.BabelRuntime.getPrototypeOf',
  '@babel/runtime/helpers/inherits': '__kbnSharedDeps.BabelRuntime.inherits',
  '@babel/runtime/helpers/inheritsLoose': '__kbnSharedDeps.BabelRuntime.inheritsLoose',
  '@babel/runtime/helpers/interopRequireDefault':
    '__kbnSharedDeps.BabelRuntime.interopRequireDefault',
  '@babel/runtime/helpers/interopRequireWildcard':
    '__kbnSharedDeps.BabelRuntime.interopRequireWildcard',
  '@babel/runtime/helpers/objectDestructuringEmpty':
    '__kbnSharedDeps.BabelRuntime.objectDestructuringEmpty',
  '@babel/runtime/helpers/objectSpread2': '__kbnSharedDeps.BabelRuntime.objectSpread2',
  '@babel/runtime/helpers/objectWithoutProperties':
    '__kbnSharedDeps.BabelRuntime.objectWithoutProperties',
  '@babel/runtime/helpers/objectWithoutPropertiesLoose':
    '__kbnSharedDeps.BabelRuntime.objectWithoutPropertiesLoose',
  '@babel/runtime/helpers/possibleConstructorReturn':
    '__kbnSharedDeps.BabelRuntime.possibleConstructorReturn',
  '@babel/runtime/regenerator': '__kbnSharedDeps.BabelRuntime.regenerator',
  '@babel/runtime/helpers/slicedToArray': '__kbnSharedDeps.BabelRuntime.slicedToArray',
  '@babel/runtime/helpers/taggedTemplateLiteral':
    '__kbnSharedDeps.BabelRuntime.taggedTemplateLiteral',
  '@babel/runtime/helpers/toArray': '__kbnSharedDeps.BabelRuntime.toArray',
  '@babel/runtime/helpers/toConsumableArray': '__kbnSharedDeps.BabelRuntime.toConsumableArray',
  '@babel/runtime/helpers/toPropertyKey': '__kbnSharedDeps.BabelRuntime.toPropertyKey',
  '@babel/runtime/helpers/wrapNativeSuper': '__kbnSharedDeps.BabelRuntime.wrapNativeSuper',
};
exports.publicPathLoader = require.resolve('./public_path_loader');
