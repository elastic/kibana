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
import { get } from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
export function buildNodeParams(fieldName, points) {
  var fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  var args = points.map(function (point) {
    var latLon = "".concat(point.lat, ", ").concat(point.lon);
    return nodeTypes.literal.buildNode(latLon);
  });
  return {
    arguments: [fieldNameArg].concat(_toConsumableArray(args))
  };
}
export function toElasticsearchQuery(node, indexPattern) {
  var _geo_polygon;

  var _node$arguments = _toArray(node.arguments),
      fieldNameArg = _node$arguments[0],
      points = _node$arguments.slice(1);

  var fieldName = nodeTypes.literal.toElasticsearchQuery(fieldNameArg);
  var field = get(indexPattern, 'fields', []).find(function (field) {
    return field.name === fieldName;
  });
  var queryParams = {
    points: points.map(ast.toElasticsearchQuery)
  };

  if (field && field.scripted) {
    throw new Error("Geo polygon query does not support scripted fields");
  }

  return {
    geo_polygon: (_geo_polygon = {}, _defineProperty(_geo_polygon, fieldName, queryParams), _defineProperty(_geo_polygon, "ignore_unmapped", true), _geo_polygon)
  };
}