"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNode = buildNode;
exports.toElasticsearchQuery = toElasticsearchQuery;

var _lodash = _interopRequireDefault(require("lodash"));

var ast = _interopRequireWildcard(require("../ast"));

var _node_types = require("../node_types");

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function buildNode(name, value) {
  const argumentNode = _lodash.default.get(value, 'type') === 'literal' ? value : _node_types.nodeTypes.literal.buildNode(value);
  return {
    type: 'namedArg',
    name,
    value: argumentNode
  };
}

function toElasticsearchQuery(node) {
  return ast.toElasticsearchQuery(node.value);
}