"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.buildNodeParams = buildNodeParams;
exports.toElasticsearchQuery = toElasticsearchQuery;

var _lodash = require("lodash");

var _node_types = require("../node_types");

var ast = _interopRequireWildcard(require("../ast"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

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
function buildNodeParams(fieldName, points) {
  const fieldNameArg = _node_types.nodeTypes.literal.buildNode(fieldName);

  const args = points.map(point => {
    const latLon = `${point.lat}, ${point.lon}`;
    return _node_types.nodeTypes.literal.buildNode(latLon);
  });
  return {
    arguments: [fieldNameArg, ...args]
  };
}

function toElasticsearchQuery(node, indexPattern) {
  const [fieldNameArg, ...points] = node.arguments;

  const fieldName = _node_types.nodeTypes.literal.toElasticsearchQuery(fieldNameArg);

  const field = (0, _lodash.get)(indexPattern, 'fields', []).find(field => field.name === fieldName);
  const queryParams = {
    points: points.map(ast.toElasticsearchQuery)
  };

  if (field && field.scripted) {
    throw new Error(`Geo polygon query does not support scripted fields`);
  }

  return {
    geo_polygon: {
      [fieldName]: queryParams,
      ignore_unmapped: true
    }
  };
}