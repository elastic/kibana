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
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = points.map((point) => {
    const latLon = `${point.lat}, ${point.lon}`;
    return nodeTypes.literal.buildNode(latLon);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern, config = {}, context = {}) {
  const [ fieldNameArg, ...points ] = node.arguments;
  const fullFieldNameArg = { ...fieldNameArg, value: context.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value };
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fullFieldNameArg);
  const field = get(indexPattern, 'fields', []).find(field => field.name === fieldName);
  const queryParams = {
    points: points.map((point) => { return ast.toElasticsearchQuery(point, indexPattern, config, context); })
  };

  if (field && field.scripted) {
    throw new Error(`Geo polygon query does not support scripted fields`);
  }

  return {
    geo_polygon: {
      [fieldName]: queryParams,
      ignore_unmapped: true,
    },
  };
}
