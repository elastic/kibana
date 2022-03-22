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
import { KQL_NODE_TYPE_FUNCTION } from '../node_types/function';
import { nodeTypes } from '../..';

export const KQL_FUNCTION_NAME_AND = 'and';

export interface KqlAndFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_AND;
  arguments: KqlFunctionNode[]; // Sub-queries
}

export function isNode(node: KqlFunctionNode): node is KqlAndFunctionNode {
  return node.function === KQL_FUNCTION_NAME_AND;
}

export function buildNode(subQueries: KqlFunctionNode[]): KqlAndFunctionNode {
  return {
    type: KQL_NODE_TYPE_FUNCTION,
    function: KQL_FUNCTION_NAME_AND,
    arguments: subQueries,
  };
}

export function toElasticsearchQuery(
  { arguments: nodes = [] }: KqlAndFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): DslQuery {
  const key = config.filtersInMustClause ? 'must' : 'filter';
  const clause = nodes.map((node) => {
    return nodeTypes.function.toElasticsearchQuery(node, indexPattern, config, context);
  });

  return {
    bool: {
      [key]: clause,
    },
  };
}
