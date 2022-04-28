/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Code that works around incompatibilities between different
// versions of Kibana / ES.
// Currently, we work with 8.1 and 8.3 and thus this code only needs
// to address the incompatibilities between those two versions.

import type { TransportResult } from '@elastic/transport/lib/types';
import type {
  SearchResponse,
  SearchHitsMetadata,
  SearchHit,
  MgetResponse,
  MgetResponseItem,
  AggregationsAggregate,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from 'kibana/server';
import type { DataRequestHandlerContext } from '../../../data/server';

// Search results in 8.1 have 'body' but not in 8.3.
export function getHits(
  res: TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
): SearchHitsMetadata<unknown> {
  return 'body' in res ? res.body.hits : res.hits;
}

export function getAggs(
  res: TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
): Record<string, AggregationsAggregate> | undefined {
  return 'body' in res ? res.body.aggregations : res.aggregations;
}

export function getHitsItems(
  res: TransportResult<SearchResponse<unknown, Record<string, AggregationsAggregate>>, unknown>
): Array<SearchHit<unknown>> {
  return getHits(res)?.hits ?? [];
}

// Mget results in 8.1 have 'body' but not in 8.3.
export function getDocs(
  res: TransportResult<MgetResponse<any>, unknown>
): Array<MgetResponseItem<any>> {
  return ('body' in res ? res.body.docs : res.docs) ?? [];
}

// In 8.3, context.core is a Promise.
export async function getClient(context: DataRequestHandlerContext): Promise<ElasticsearchClient> {
  return typeof context.core.then === 'function'
    ? (await context.core).elasticsearch.client.asCurrentUser
    : context.core.elasticsearch.client.asCurrentUser;
}
