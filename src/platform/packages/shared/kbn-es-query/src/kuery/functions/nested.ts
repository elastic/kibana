/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as ast from '../ast';
import * as literal from '../node_types/literal';
import type { DataViewBase, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode, KqlLiteralNode } from '../node_types';
import type { KqlContext } from '../types';

export const KQL_FUNCTION_NESTED = 'nested';

export interface KqlNestedFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NESTED;
  arguments: [KqlLiteralNode, KqlFunctionNode];
}

export function isNode(node: KqlFunctionNode): node is KqlNestedFunctionNode {
  return node.function === KQL_FUNCTION_NESTED;
}

export function buildNodeParams(path: any, child: any) {
  const pathNode =
    typeof path === 'string' ? ast.fromLiteralExpression(path) : literal.buildNode(path);
  return {
    arguments: [pathNode, child],
  };
}

export function toElasticsearchQuery(
  node: KqlNestedFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const [path, child] = node.arguments;
  const stringPath = ast.toElasticsearchQuery(path) as unknown as string;
  const fullPath = context?.nested?.path ? `${context.nested.path}.${stringPath}` : stringPath;

  return {
    nested: {
      path: fullPath,
      query: ast.toElasticsearchQuery(child, indexPattern, config, {
        ...context,
        nested: { path: fullPath },
      }),
      score_mode: 'none',
      ...(typeof config.nestedIgnoreUnmapped === 'boolean' && {
        ignore_unmapped: config.nestedIgnoreUnmapped,
      }),
    },
  };
}

export function toKqlExpression(node: KqlNestedFunctionNode): string {
  const [path, child] = node.arguments;
  return `${literal.toKqlExpression(path)}: { ${ast.toKqlExpression(child)} }`;
}
