/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { nodeTypes } from '../node_types/index';
import { KQLSyntaxError } from '../kuery_syntax_error';
import { KueryNode, DslQuery, KueryParseOptions } from '../types';
import { IIndexPattern } from '../../../index_patterns/types';

// @ts-ignore
import { parse as parseKuery } from './_generated_/kuery';
import { JsonObject } from '../../../../../kibana_utils/common';

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
