/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { JsonObject } from '@kbn/utility-types';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { nodeTypes } from '../node_types';
import { KQLSyntaxError } from '../kuery_syntax_error';
import { KueryNode, KueryParseOptions, KueryQueryOptions } from '../types';

import { parse as parseKuery } from '../grammar';
import { DataViewBase } from '../..';

const fromExpression = (
  expression: string | estypes.QueryDslQueryContainer,
  parseOptions: Partial<KueryParseOptions> = {},
  parse: Function = parseKuery
): KueryNode => {
  if (typeof expression === 'undefined') {
    throw new Error('expression must be a string, got undefined instead');
  }

  return parse(expression, { ...parseOptions, helpers: { nodeTypes } });
};

export const fromLiteralExpression = (
  expression: string | estypes.QueryDslQueryContainer,
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
  expression: string | estypes.QueryDslQueryContainer,
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

/**
 * @params {String} indexPattern
 * @params {Object} config - contains the dateFormatTZ
 *
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 *
 */
export const toElasticsearchQuery = (
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context?: Record<string, any>
): JsonObject => {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []), indexPattern);
  }

  // TODO: the return type of this function might be incorrect and it works only because of this casting
  const nodeType = nodeTypes[node.type] as unknown as any;
  return nodeType.toElasticsearchQuery(node, indexPattern, config, context);
};
