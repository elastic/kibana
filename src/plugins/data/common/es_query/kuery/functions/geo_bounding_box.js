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
  const fieldNameArg = nodeTypes.literal.buildNode(fieldName);
  const args = _.map(params, (value, key) => {
    const latLon = `${value.lat}, ${value.lon}`;
    return nodeTypes.namedArg.buildNode(key, latLon);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern, config, context = {}) {
  const [fieldNameArg, ...args] = node.arguments;
  const fullFieldNameArg = {
    ...fieldNameArg,
    value: context.nested ? `${context.nested.path}.${fieldNameArg.value}` : fieldNameArg.value,
  };
  const fieldName = nodeTypes.literal.toElasticsearchQuery(fullFieldNameArg);
  const field = _.get(indexPattern, 'fields', []).find(field => field.name === fieldName);
  const queryParams = args.reduce((acc, arg) => {
    const snakeArgName = _.snakeCase(arg.name);
    return {
      ...acc,
      [snakeArgName]: ast.toElasticsearchQuery(arg),
    };
  }, {});

  if (field && field.scripted) {
    throw new Error(`Geo bounding box query does not support scripted fields`);
  }

  return {
    geo_bounding_box: {
      [fieldName]: queryParams,
      ignore_unmapped: true,
    },
  };
}
