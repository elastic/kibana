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
import { parse as parseKuery } from './kuery'; // TINA: stay out of this file, it looks scary!
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
  // TINA parseOptions contains {allowLeadingWildcards, dateFormatTZ}
  return fromExpression(expression, parseOptions, parseKuery);
}

function fromExpression(expression, parseOptions = {}, parse = parseKuery) {
  // TINA parseOptions contains {allowLeadingWildcards, dateFormatTZ}
  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  parseOptions = {
    ...parseOptions,
    helpers: { nodeTypes },
  };

  return parse(expression, parseOptions); // TINA parseOptions now contains {allowLeadingWildcards, dateFormatTZ, helpers = {nodeTypes}}
}

// indexPattern isn't required, but if you pass one in, we can be more intelligent
// about how we craft the queries (e.g. scripted fields)

/* TINA
  Adding in the Time Zone:
  TODO:
  1. add in the time_zone nested in a config parameter, similarly to how the indexPattern is treated in here.
  (We don't have access to settings in this package, so we have to pass down the config (that will have the time_zone in it))
*/
export function toElasticsearchQuery(node, indexPattern, dateFormatTZ) {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', [])); // TINA: Looks like this is simply a recursive call with forcing a node type of 'and'.
  }

  return nodeTypes[node.type].toElasticsearchQuery(node, indexPattern, dateFormatTZ); // TINA: toElasticsearchQuery on this line is the one nested within the nodeTypes.
}

export function doesKueryExpressionHaveLuceneSyntaxError(expression) {
  try {
    fromExpression(expression, { errorOnLuceneSyntax: true }, parseKuery);
    return false;
  } catch (e) {
    return (e.message.startsWith('Lucene'));
  }
}
