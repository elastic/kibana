/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase } from '../..';
import type { KqlNode } from '../node_types/types';
import type { KqlContext, KueryParseOptions, KueryQueryOptions } from '../types';
import { nodeTypes } from '../node_types/index';
import { KQLSyntaxError } from '../kuery_syntax_error';
import { parse } from '../grammar';
import { KqlLiteralNode } from '../node_types/literal';
import { KqlWildcardNode } from '../node_types/wildcard';

const fromExpression = <T extends KqlNode = KqlNode>(
  expression: string,
  parseOptions: Partial<KueryParseOptions> = {}
): T => {
  if (typeof expression === 'undefined') {
    throw new Error('expression must be a string, got undefined instead');
  }

  return parse(expression, parseOptions);
};

/**
 * Generates the KQL AST from the given literal expression
 * @see "Literal" rule in grammar.peggy
 */
export const fromLiteralExpression = (
  expression: string,
  parseOptions: Partial<KueryParseOptions> = {}
): KqlLiteralNode | KqlWildcardNode => {
  return fromExpression(expression, {
    ...parseOptions,
    startRule: 'Literal',
  });
};

/**
 * Generates the KQL AST from the given expression
 * @see grammar.peggy
 */
export const fromKueryExpression = (
  expression: string,
  parseOptions: Partial<KueryParseOptions> = {}
) => {
  try {
    return fromExpression(expression, parseOptions);
  } catch (error) {
    if (error.name === 'SyntaxError') {
      throw new KQLSyntaxError(error, expression);
    } else {
      throw error;
    }
  }
};

/**
 * IndexPattern isn't required, but if you pass one in, we can be more intelligent
 * about how we craft the queries (e.g. scripted fields)
 */
export const toElasticsearchQuery = (
  node: KqlNode | null,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context?: KqlContext
) => {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return nodeTypes.function.toElasticsearchQuery(
      nodeTypes.function.buildNode('and', []),
      indexPattern
    );
  } else if (nodeTypes.function.isNode(node)) {
    return nodeTypes.function.toElasticsearchQuery(node, indexPattern, config, context);
  } else if (nodeTypes.literal.isNode(node)) {
    return nodeTypes.literal.toElasticsearchQuery(node);
  } else if (nodeTypes.wildcard.isNode(node)) {
    return nodeTypes.wildcard.toElasticsearchQuery(node);
  }
};
