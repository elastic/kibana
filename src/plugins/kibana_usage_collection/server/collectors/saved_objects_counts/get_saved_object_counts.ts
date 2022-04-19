/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export async function getSavedObjectsCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string, // Typically '.kibana'. We might need a way to obtain it from the SavedObjects client (or the SavedObjects client to provide a way to run aggregations?)
  onlyTypes: string[] = []
): Promise<Array<{ key: string; doc_count: number }>> {
  const query = onlyTypes.length ? { terms: { type: onlyTypes } } : { match_all: {} };

  const savedObjectCountSearchParams = {
    index: kibanaIndex,
    ignore_unavailable: true,
    filter_path: 'aggregations.types.buckets',
    body: {
      size: 0,
      query,
      aggs: { types: { terms: { field: 'type' } } },
    },
  };
  const body = await esClient.search(savedObjectCountSearchParams);
  // @ts-expect-error declare type for aggregations explicitly
  return body.aggregations?.types?.buckets || [];
}
