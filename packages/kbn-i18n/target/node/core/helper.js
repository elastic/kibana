"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeAll = exports.unique = exports.hasValues = exports.isObject = exports.isString = void 0;

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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
const isString = value => typeof value === 'string';

exports.isString = isString;

const isObject = value => typeof value === 'object' && value !== null;

exports.isObject = isObject;

const hasValues = values => Object.keys(values).length > 0;

exports.hasValues = hasValues;

const unique = (arr = []) => [...new Set(arr)];

exports.unique = unique;

const merge = (a, b) => unique([...Object.keys(a), ...Object.keys(b)]).reduce((acc, key) => {
  if (isObject(a[key]) && isObject(b[key]) && !Array.isArray(a[key]) && !Array.isArray(b[key])) {
    return _objectSpread({}, acc, {
      [key]: merge(a[key], b[key])
    });
  }

  return _objectSpread({}, acc, {
    [key]: b[key] === undefined ? a[key] : b[key]
  });
}, {});

const mergeAll = (...sources) => sources.filter(isObject).reduce((acc, source) => merge(acc, source));

exports.mergeAll = mergeAll;