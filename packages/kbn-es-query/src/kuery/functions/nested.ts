/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase, DslQuery, KueryQueryOptions } from '../..';
import type { KqlFunctionNode } from '../node_types/function';
import type { KqlLiteralNode } from '../node_types/literal';
import type { KqlWildcardNode } from '../node_types/wildcard';
import { nodeTypes } from '../..';
import * as ast from '../ast';

export const KQL_FUNCTION_NAME_NESTED = 'nested';

export interface KqlNestedFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_NESTED;
  arguments: [
    KqlLiteralNode | KqlWildcardNode, // Nested path
    KqlFunctionNode // Nested query
  ];
}

export function isNode(node: KqlFunctionNode): node is KqlNestedFunctionNode {
  return node.function === KQL_FUNCTION_NAME_NESTED;
}

export function toElasticsearchQuery(
  { arguments: [nestedPath, nestedQuery] }: KqlNestedFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: Record<string, any> = {}
): DslQuery {
  const stringPath = `${ast.toElasticsearchQuery(nestedPath)}`;
  const path = context?.nested?.path ? `${context.nested.path}.${stringPath}` : stringPath;
  const query = nodeTypes.function.toElasticsearchQuery(nestedQuery, indexPattern, config, {
    ...context,
    nested: { path },
  });

  return {
    nested: {
      path,
      query,
      score_mode: 'none',
    },
  };
}
