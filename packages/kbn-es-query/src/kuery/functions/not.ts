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
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode } from '../node_types';
import type { KqlContext } from '../types';

export const KQL_FUNCTION_NOT = 'not';

export interface KqlNotFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_NOT;
  arguments: [KqlFunctionNode];
}

export function isNode(node: KqlFunctionNode): node is KqlNotFunctionNode {
  return node.function === KQL_FUNCTION_NOT;
}

export function buildNodeParams(child: KueryNode) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(
  node: KqlNotFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const [argument] = node.arguments;

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(argument, indexPattern, config, context),
    },
  };
}

export function toKqlExpression(node: KqlNotFunctionNode): string {
  const [child] = node.arguments;
  return `NOT ${ast.toKqlExpression(child)}`;
}
