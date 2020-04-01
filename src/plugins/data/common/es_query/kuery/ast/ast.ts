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

import { nodeTypes } from '../node_types/index';
import { KQLSyntaxError } from '../kuery_syntax_error';
import { KueryNode, DslQuery, KueryParseOptions } from '../types';
import { IIndexPattern } from '../../../index_patterns/types';

// @ts-ignore
import { parse as parseKuery } from './_generated_/kuery';
import { JsonObject } from '../../../../../kibana_utils/public';

const fromExpression = (
  expression: string | DslQuery,
  parseOptions: Partial<KueryParseOptions> = {},
  parse: Function = parseKuery
): KueryNode => {
  if (typeof expression === 'undefined') {
    throw new Error('expression must be a string, got undefined instead');
  }

  return parse(expression, { ...parseOptions, helpers: { nodeTypes } });
};

export const fromLiteralExpression = (
  expression: string | DslQuery,
  parseOptions: Partial<KueryParseOptions> = {}
): KueryNode => {
  return fromExpression(
    expression,
    {
      ...parseOptions,
      startRule: 'Literal',
    },
    parseKuery
  );
};

export const fromKueryExpression = (
  expression: string | DslQuery,
  parseOptions: Partial<KueryParseOptions> = {}
): KueryNode => {
  try {
    return fromExpression(expression, parseOptions, parseKuery);
  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new KQLSyntaxError(error, expression);
    } else {
      throw error;
    }
  }
};

export const doesKueryExpressionHaveLuceneSyntaxError = (
  expression: string | DslQuery
): boolean => {
  try {
    fromExpression(expression, { errorOnLuceneSyntax: true }, parseKuery);
    return false;
  } catch (e) {
    return e.message.startsWith('Lucene');
  }
};

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export const toElasticsearchQuery = (
  node: KueryNode,
  indexPattern?: IIndexPattern,
  config?: Record<string, any>,
  context?: Record<string, any>
): JsonObject => {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []), indexPattern);
  }

  const nodeType = (nodeTypes[node.type] as unknown) as any;

  return nodeType.toElasticsearchQuery(node, indexPattern, config, context);
};
