/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as ast from '../ast';
import * as literal from '../node_types/literal';
import { IIndexPattern, KueryNode } from '../../..';

export function buildNodeParams(path: any, child: any) {
  const pathNode =
    typeof path === 'string' ? ast.fromLiteralExpression(path) : literal.buildNode(path);
  return {
    arguments: [pathNode, child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: IIndexPattern,
  config: Record<string, any> = {},
  context: Record<string, any> = {}
) {
  const [path, child] = node.arguments;
  const stringPath = ast.toElasticsearchQuery(path);
  const fullPath = context?.nested?.path ? `${context.nested.path}.${stringPath}` : stringPath;

  return {
    nested: {
      path: fullPath,
      query: ast.toElasticsearchQuery(child, indexPattern, config, {
        ...context,
        nested: { path: fullPath },
      }),
      score_mode: 'none',
    },
  };
}
