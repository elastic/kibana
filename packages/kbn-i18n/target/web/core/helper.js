"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mergeAll = exports.unique = exports.hasValues = exports.isObject = exports.isString = void 0;

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
var isString = function isString(value) {
  return typeof value === 'string';
};

exports.isString = isString;

var isObject = function isObject(value) {
  return _typeof(value) === 'object' && value !== null;
};

exports.isObject = isObject;

var hasValues = function hasValues(values) {
  return Object.keys(values).length > 0;
};

exports.hasValues = hasValues;

var unique = function unique() {
  var arr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
  return _toConsumableArray(new Set(arr));
};

exports.unique = unique;

var merge = function merge(a, b) {
  return unique([].concat(_toConsumableArray(Object.keys(a)), _toConsumableArray(Object.keys(b)))).reduce(function (acc, key) {
    if (isObject(a[key]) && isObject(b[key]) && !Array.isArray(a[key]) && !Array.isArray(b[key])) {
      return _objectSpread({}, acc, _defineProperty({}, key, merge(a[key], b[key])));
    }

    return _objectSpread({}, acc, _defineProperty({}, key, b[key] === undefined ? a[key] : b[key]));
  }, {});
};

var mergeAll = function mergeAll() {
  for (var _len = arguments.length, sources = new Array(_len), _key = 0; _key < _len; _key++) {
    sources[_key] = arguments[_key];
  }

  return sources.filter(isObject).reduce(function (acc, source) {
    return merge(acc, source);
  });
};

exports.mergeAll = mergeAll;