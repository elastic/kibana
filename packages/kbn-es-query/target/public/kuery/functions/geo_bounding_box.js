function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; var ownKeys = Object.keys(source); if (typeof Object.getOwnPropertySymbols === 'function') { ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) { return Object.getOwnPropertyDescriptor(source, sym).enumerable; })); } ownKeys.forEach(function (key) { _defineProperty(target, key, source[key]); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toArray(arr) { return _arrayWithHoles(arr) || _iterableToArray(arr) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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
import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
export function buildNodeParams(fieldName, params) {
  params = _.pick(params, 'topLeft', 'bottomRight');
  var fieldNameArg = nodeTypes.literal.buildNode(fieldName);

  var args = _.map(params, function (value, key) {
    var latLon = "".concat(value.lat, ", ").concat(value.lon);
    return nodeTypes.namedArg.buildNode(key, latLon);
  });

  return {
    arguments: [fieldNameArg].concat(_toConsumableArray(args))
  };
}
export function toElasticsearchQuery(node, indexPattern) {
  var _geo_bounding_box;

  var _node$arguments = _toArray(node.arguments),
      fieldNameArg = _node$arguments[0],
      args = _node$arguments.slice(1);

  var fieldName = nodeTypes.literal.toElasticsearchQuery(fieldNameArg);

  var field = _.get(indexPattern, 'fields', []).find(function (field) {
    return field.name === fieldName;
  });

  var queryParams = args.reduce(function (acc, arg) {
    var snakeArgName = _.snakeCase(arg.name);

    return _objectSpread({}, acc, _defineProperty({}, snakeArgName, ast.toElasticsearchQuery(arg)));
  }, {});

  if (field && field.scripted) {
    throw new Error("Geo bounding box query does not support scripted fields");
  }

  return {
    geo_bounding_box: (_geo_bounding_box = {}, _defineProperty(_geo_bounding_box, fieldName, queryParams), _defineProperty(_geo_bounding_box, "ignore_unmapped", true), _geo_bounding_box)
  };
}