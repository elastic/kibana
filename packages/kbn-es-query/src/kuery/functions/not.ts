/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as ast from '../ast';
import type { DataViewBase, KueryNode, KueryQueryOptions } from '../../..';
import type { KqlContext } from '../types';

export function buildNodeParams(child: KueryNode) {
  return {
    arguments: [child],
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: KqlContext = {}
): estypes.QueryDslQueryContainer {
  const [argument] = node.arguments;

  return {
    bool: {
      must_not: ast.toElasticsearchQuery(
        argument,
        indexPattern,
        config,
        context
      ) as estypes.QueryDslQueryContainer,
    },
  };
}
