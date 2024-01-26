/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as ast from '../ast';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlFunctionNode } from '../node_types';
import type { KqlContext } from '../types';

export const KQL_FUNCTION_OR = 'or';

export interface KqlOrFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_OR;
  arguments: KqlFunctionNode[];
}

export function isNode(node: KqlFunctionNode): node is KqlOrFunctionNode {
  return node.function === KQL_FUNCTION_OR;
}

export function buildNodeParams(children: KueryNode[]) {
  return {
    arguments: children,
  };
}

export function toElasticsearchQuery(
  node: KqlOrFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const children = node.arguments || [];

  return {
    bool: {
      should: children.map((child: KueryNode) => {
        return ast.toElasticsearchQuery(child, indexPattern, config, context);
      }),
      minimum_should_match: 1,
    },
  };
}

export function toKqlExpression(node: KqlOrFunctionNode): string {
  return `(${node.arguments.map(ast.toKqlExpression).join(' OR ')})`;
}
