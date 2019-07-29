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
import _ from 'lodash';
import { functions } from '../functions';
export function buildNode(functionName) {
  var kueryFunction = functions[functionName];

  if (_.isUndefined(kueryFunction)) {
    throw new Error("Unknown function \"".concat(functionName, "\""));
  }

  for (var _len = arguments.length, functionArgs = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    functionArgs[_key - 1] = arguments[_key];
  }

  return _objectSpread({
    type: 'function',
    function: functionName
  }, kueryFunction.buildNodeParams.apply(kueryFunction, functionArgs));
} // Mainly only useful in the grammar where we'll already have real argument nodes in hand

export function buildNodeWithArgumentNodes(functionName, argumentNodes) {
  if (_.isUndefined(functions[functionName])) {
    throw new Error("Unknown function \"".concat(functionName, "\""));
  }

  return {
    type: 'function',
    function: functionName,
    arguments: argumentNodes
  };
}
export function toElasticsearchQuery(node, indexPattern) {
  var config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var kueryFunction = functions[node.function];
  return kueryFunction.toElasticsearchQuery(node, indexPattern, config);
}