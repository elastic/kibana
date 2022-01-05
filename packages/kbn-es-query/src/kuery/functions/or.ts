/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewBase, DslQuery, KueryQueryOptions } from '../..';
import type { KqlFunctionNode } from '../node_types/function';
import type { KqlContext } from '../types';
import { nodeTypes } from '../..';
import { KQL_NODE_TYPE_FUNCTION } from '../node_types/function';

export const KQL_FUNCTION_NAME_OR = 'or';

export interface KqlOrFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_OR;
  arguments: KqlFunctionNode[]; // Sub-queries
}

export function isNode(node: KqlFunctionNode): node is KqlOrFunctionNode {
  return node.function === KQL_FUNCTION_NAME_OR;
}

export function buildNode(subQueries: KqlFunctionNode[]): KqlOrFunctionNode {
  return {
    type: KQL_NODE_TYPE_FUNCTION,
    function: KQL_FUNCTION_NAME_OR,
    arguments: subQueries,
  };
}

export function toElasticsearchQuery(
  { arguments: nodes = [] }: KqlOrFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): DslQuery {
  const clause = nodes.map((node) => {
    return nodeTypes.function.toElasticsearchQuery(node, indexPattern, config, context);
  });

  // If we have only one query, no need to wrap it in a bool clause
  if (clause.length === 1) return clause[0];

  return {
    bool: {
      should: clause,
      minimum_should_match: 1,
    },
  };
}
