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

export const KQL_FUNCTION_AND = 'and';

export interface KqlAndFunctionNode extends KqlFunctionNode {
  function: typeof KQL_FUNCTION_AND;
  arguments: KqlFunctionNode[];
}

export function isNode(node: KqlFunctionNode): node is KqlAndFunctionNode {
  return node.function === KQL_FUNCTION_AND;
}

export function buildNodeParams(children: KueryNode[]) {
  return {
    arguments: children,
  };
}

export function toElasticsearchQuery(
  node: KqlAndFunctionNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): QueryDslQueryContainer {
  const { filtersInMustClause } = config;
  const children = node.arguments || [];
  const key = filtersInMustClause ? 'must' : 'filter';

  return {
    bool: {
      [key]: children.map((child: KueryNode) => {
        return ast.toElasticsearchQuery(child, indexPattern, config, context);
      }),
    },
  };
}

export function toKqlExpression(node: KqlAndFunctionNode): string {
  return `(${node.arguments.map(ast.toKqlExpression).join(' AND ')})`;
}
