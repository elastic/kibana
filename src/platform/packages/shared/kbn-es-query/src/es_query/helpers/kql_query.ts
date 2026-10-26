/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { DataViewBase, KueryParseOptions, KueryQueryOptions } from '../../..';
import { fromKueryExpression, toElasticsearchQuery } from '../../..';
import type { KqlContext } from '../../kuery/types';

interface ElasticsearchQueryOptions {
  indexPattern?: DataViewBase;
  config?: KueryQueryOptions;
  context?: KqlContext;
}

export function kqlQuery(
  kql?: string,
  parseOptions: Partial<KueryParseOptions> = {},
  esQueryOptions: Partial<ElasticsearchQueryOptions> = {}
): estypes.QueryDslQueryContainer[] {
  if (!kql) {
    return [];
  }

  const ast = fromKueryExpression(kql, parseOptions);
  return [
    toElasticsearchQuery(
      ast,
      esQueryOptions.indexPattern,
      esQueryOptions.config,
      esQueryOptions.context
    ),
  ];
}
