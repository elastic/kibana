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
import { nodeTypes } from '../node_types/index';
import { parse as parseKuery } from './kuery';
import { parse as parseLegacyKuery } from './legacy_kuery';

export function fromLiteralExpression(expression, parseOptions) {
  parseOptions = {
    ...parseOptions,
    startRule: 'Literal',
  };

  return fromExpression(expression, parseOptions, parseKuery);
}

export function fromLegacyKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, parseLegacyKuery);
}

export function fromKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, parseKuery);
}

function fromExpression(expression, parseOptions = {}, parse = parseKuery) {
  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  parseOptions = {
    ...parseOptions,
    helpers: { nodeTypes }
  };

  return parse(expression, parseOptions);
}

// indexPattern isn't required, but if you pass one in, we can be more intelligent
// about how we craft the queries (e.g. scripted fields)
export function toElasticsearchQuery(node, indexPattern) {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []));
  }

  return nodeTypes[node.type].toElasticsearchQuery(node, indexPattern);
}
