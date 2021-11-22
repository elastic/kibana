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

export const KQL_FUNCTION_NAME_NOT = 'not';

export interface KqlNotFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NAME_NOT;
  arguments: [KqlFunctionNode]; // Sub-query
}

export function isNode(node: KqlFunctionNode): node is KqlNotFunctionNode {
  return node.function === KQL_FUNCTION_NAME_NOT;
}

export function toElasticsearchQuery(
  { arguments: [node] }: KqlNotFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): DslQuery {
  const clause = nodeTypes.function.toElasticsearchQuery(node, indexPattern, config, context);
  return {
    bool: {
      must_not: clause,
    },
  };
}
