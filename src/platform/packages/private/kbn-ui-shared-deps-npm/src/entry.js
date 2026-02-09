/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Entry point for the @kbn/ui-shared-deps-npm bundle.
 * This replaces the webpack DLL entry array.
 *
 * All npm dependencies shared across Kibana plugins are imported here
 * and bundled into a single IIFE exposed as `__kbnSharedDeps_npm__`.
 */

// Polyfills (side-effect only imports)
import 'core-js/stable';
import 'symbol-observable';

// Node.js polyfills for browser (side-effect imports)
import 'buffer';
import 'punycode';
import 'util';
import 'url';
import 'qs';

// Babel runtime helpers
export * as _assertThisInitialized from '@babel/runtime/helpers/assertThisInitialized';
export * as _classPrivateFieldGet from '@babel/runtime/helpers/classPrivateFieldGet';
export * as _classPrivateFieldSet from '@babel/runtime/helpers/classPrivateFieldSet';
export * as _defineProperty from '@babel/runtime/helpers/defineProperty';
export * as _extends from '@babel/runtime/helpers/extends';
export * as _inheritsLoose from '@babel/runtime/helpers/inheritsLoose';
export * as _taggedTemplateLiteralLoose from '@babel/runtime/helpers/taggedTemplateLiteralLoose';
export * as _wrapNativeSuper from '@babel/runtime/helpers/wrapNativeSuper';

// Core npm modules — use namespace exports to avoid missing default export issues
export * as ElasticApmRumCore from '@elastic/apm-rum-core';
export * as ElasticCharts from '@elastic/charts';
export * as ElasticEui from '@elastic/eui';
export * as ElasticEuiNested from '@elastic/eui/optimize/es/components/provider/nested';
export * as ElasticEuiThemeWarning from '@elastic/eui/optimize/es/services/theme/warning';
export { default as ElasticEuiThemeBorealisLight } from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_light.json';
export { default as ElasticEuiThemeBorealisDark } from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_dark.json';
export * as ElasticEuiThemeBorealis from '@elastic/eui-theme-borealis';
export * as ElasticNumeral from '@elastic/numeral';
export * as EmotionCache from '@emotion/cache';
export * as EmotionReact from '@emotion/react';
export * as HelloPangeaDnd from '@hello-pangea/dnd/dist/dnd.js';
export * as ReduxjsToolkit from '@reduxjs/toolkit';
export * as Redux from 'redux';
export * as ReactRedux from 'react-redux';
export * as Immer from 'immer';
export * as ReactQuery from '@tanstack/react-query';
export * as ReactQueryDevtools from '@tanstack/react-query-devtools';
export * as classnames from 'classnames';
export * as FastestLevenshtein from 'fastest-levenshtein';
export * as History from 'history';
export * as FpTs from 'fp-ts';
export * as IoTs from 'io-ts';
export * as jquery from 'jquery';
export * as lodash from 'lodash';
export * as lodashFp from 'lodash/fp';
export * as momentTimezone from 'moment-timezone/moment-timezone';
export { default as momentTimezoneData } from 'moment-timezone/data/packed/latest.json';
export * as moment from 'moment';
export * as ReactDom from 'react-dom';
export * as ReactDomServer from 'react-dom/server';
export * as ReactRouterDom from 'react-router-dom';
export * as ReactRouterDomV5Compat from 'react-router-dom-v5-compat';
export * as ReactRouter from 'react-router';
export * as React from 'react';
export * as Reselect from 'reselect';
export * as Rxjs from 'rxjs';
export * as StyledComponents from 'styled-components';
export * as tslib from 'tslib';
export * as uuid from 'uuid';
