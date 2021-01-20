/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as ast from '../ast';
import { IIndexPattern, KueryNode } from '../../..';

export function buildNodeParams(child: KueryNode) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: IIndexPattern,
  config: Record<string, any> = {},
  context: Record<string, any> = {}
) {
  const [argument] = node.arguments;

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(argument, indexPattern, config, context),
    },
  };
}
