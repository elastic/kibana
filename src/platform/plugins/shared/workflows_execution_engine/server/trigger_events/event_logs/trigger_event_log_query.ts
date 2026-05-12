/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { WORKFLOWS_EVENTS_DATA_VIEW } from '@kbn/workflows';
import { MAX_PAGE_SIZE, TRACK_TOTAL_HITS_CAP } from './constants';
import type {
  TriggerEventDocument,
  TriggerEventsDataStreamClient,
} from './trigger_events_data_stream';

export interface SearchTriggerEventLogParams {
  spaceId: string;
  triggerIds?: string[];
  kql?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface SearchTriggerEventLogHit {
  id: string;
  source: TriggerEventDocument;
}

export interface SearchTriggerEventLogResult {
  hits: SearchTriggerEventLogHit[];
  total: number;
  page: number;
  size: number;
}

function parseTriggerEventHitSource(raw: unknown): TriggerEventDocument {
  if (!raw || typeof raw !== 'object') {
    return {
      '@timestamp': '',
      eventId: '',
      triggerId: '',
      spaceId: '',
      subscriptions: [],
      payload: {},
    };
  }

  const o = raw as Record<string, unknown>;
  const payloadValue = o.payload;
  const payload =
    payloadValue !== null && typeof payloadValue === 'object' && !Array.isArray(payloadValue)
      ? (payloadValue as Record<string, unknown>)
      : {};

  const subscriptionsRaw = o.subscriptions;
  const subscriptions = Array.isArray(subscriptionsRaw)
    ? subscriptionsRaw.filter((s): s is string => typeof s === 'string')
    : [];

  const doc: TriggerEventDocument = {
    '@timestamp': typeof o['@timestamp'] === 'string' ? o['@timestamp'] : '',
    eventId: typeof o.eventId === 'string' ? o.eventId : '',
    triggerId: typeof o.triggerId === 'string' ? o.triggerId : '',
    spaceId: typeof o.spaceId === 'string' ? o.spaceId : '',
    subscriptions,
    payload,
  };

  if (typeof o.sourceExecutionId === 'string' && o.sourceExecutionId !== '') {
    return { ...doc, sourceExecutionId: o.sourceExecutionId };
  }

  return doc;
}

const buildTriggerEventLogQueryClauses = (
  params: SearchTriggerEventLogParams
): { must: estypes.QueryDslQueryContainer[]; filter: estypes.QueryDslQueryContainer[] } => {
  const must: estypes.QueryDslQueryContainer[] = [];
  const filter: estypes.QueryDslQueryContainer[] = [{ term: { spaceId: params.spaceId } }];

  if (params.from !== undefined || params.to !== undefined) {
    filter.push({
      range: {
        '@timestamp': {
          ...(params.from !== undefined ? { gte: params.from } : {}),
          ...(params.to !== undefined ? { lte: params.to } : {}),
        },
      },
    });
  }

  if (params.triggerIds !== undefined && params.triggerIds.length > 0) {
    filter.push({
      terms: { triggerId: params.triggerIds },
    });
  }

  const kql = params.kql?.trim();
  if (kql) {
    const node = fromKueryExpression(kql);
    must.push(toElasticsearchQuery(node, WORKFLOWS_EVENTS_DATA_VIEW));
  }

  return { must, filter };
};

export async function searchTriggerEventLog(
  triggerEventsClient: TriggerEventsDataStreamClient | undefined,
  params: SearchTriggerEventLogParams
): Promise<SearchTriggerEventLogResult> {
  const page = Math.max(1, params.page ?? 1);
  const size = Math.min(MAX_PAGE_SIZE, Math.max(1, params.size ?? 10));

  if (!triggerEventsClient) {
    return { hits: [], total: 0, page, size };
  }

  const { must, filter } = buildTriggerEventLogQueryClauses(params);

  const bool: estypes.QueryDslBoolQuery = { filter };
  if (must.length > 0) {
    bool.must = must;
  }

  const query: estypes.QueryDslQueryContainer = { bool };

  const sort = [{ '@timestamp': { order: 'desc' as const } }];
  const from = (page - 1) * size;

  const response = await triggerEventsClient.search({
    query,
    sort,
    from,
    size,
    track_total_hits: TRACK_TOTAL_HITS_CAP,
  });

  const total =
    typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value ?? 0;

  const rawHits = response.hits.hits ?? [];

  const hits: SearchTriggerEventLogHit[] = rawHits.map((hit) => ({
    id: hit._id ?? '',
    source: parseTriggerEventHitSource(hit._source),
  }));

  return { hits, total, page, size };
}
