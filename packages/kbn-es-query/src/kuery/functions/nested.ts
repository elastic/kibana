/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as ast from '../ast';
import * as literal from '../node_types/literal';
import { DataViewBase, KueryNode, KueryQueryOptions } from '../..';

export function buildNodeParams(path: any, child: any) {
  const pathNode =
    typeof path === 'string' ? ast.fromLiteralExpression(path) : literal.buildNode(path);
  return {
    arguments: [pathNode, child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: Record<string, any> = {}
): estypes.QueryDslQueryContainer {
  const [path, child] = node.arguments;
  const stringPath = ast.toElasticsearchQuery(path) as unknown as string;
  const fullPath = context?.nested?.path ? `${context.nested.path}.${stringPath}` : stringPath;

  return {
    nested: {
      path: fullPath,
      query: ast.toElasticsearchQuery(child, indexPattern, config, {
        ...context,
        nested: { path: fullPath },
      }) as estypes.QueryDslQueryContainer,
      score_mode: 'none',
    },
  };
}
