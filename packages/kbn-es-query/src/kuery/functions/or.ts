/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import * as ast from '../ast';
import { DataViewBase, KueryNode, KueryQueryOptions } from '../..';

export function buildNodeParams(children: KueryNode[]) {
  return {
    arguments: children,
  };
}

export function toElasticsearchQuery(
  node: KueryNode,
  indexPattern?: DataViewBase,
  config: KueryQueryOptions = {},
  context: Record<string, any> = {}
): estypes.QueryDslQueryContainer {
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
