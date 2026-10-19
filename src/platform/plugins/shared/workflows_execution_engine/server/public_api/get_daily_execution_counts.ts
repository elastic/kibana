/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { isIndexNotFoundError, visibilityMustNot } from './lib/query';
import type {
  DailyExecutionCount,
  ExecutionReadDeps,
  GetDailyExecutionCountsParams,
} from './types';

interface DailyStatsBucket {
  key: number;
  key_as_string?: string;
  completed?: { doc_count: number };
  failed?: { doc_count: number };
  cancelled?: { doc_count: number };
}

/**
 * Returns daily completed, failed, and cancelled counts since `since`.
 * `includeManaged` defaults to false and drops managed runs. `visibility: deny` returns an empty list.
 * A missing index, or any search error, returns an empty list.
 */
export const getDailyExecutionCounts = async (
  deps: ExecutionReadDeps,
  { spaceId, since, visibility, includeManaged = false }: GetDailyExecutionCountsParams
): Promise<DailyExecutionCount[]> => {
  if (visibility?.access === 'deny') {
    return [];
  }
  const mustNot = visibilityMustNot(visibility);
  if (!includeManaged) {
    mustNot.push({ term: { managed: true } });
  }

  try {
    const response = await deps.workflowExecutionsDataClient.search({
      size: 0,
      query: {
        bool: {
          must: [{ range: { createdAt: { gte: since } } }, { term: { spaceId } }],
          ...(mustNot.length > 0 ? { must_not: mustNot } : {}),
        },
      },
      aggs: {
        daily_stats: {
          date_histogram: {
            field: 'createdAt',
            calendar_interval: 'day',
            format: 'yyyy-MM-dd',
          },
          aggs: {
            completed: { filter: { term: { status: 'completed' } } },
            failed: { filter: { term: { status: 'failed' } } },
            cancelled: { filter: { term: { status: 'cancelled' } } },
          },
        },
      },
    });

    const buckets =
      (
        response.aggregations?.daily_stats as
          | { buckets?: DailyStatsBucket[] | estypes.AggregationsBuckets<DailyStatsBucket> }
          | undefined
      )?.buckets ?? [];
    const list = Array.isArray(buckets) ? buckets : [];
    return list.map((bucket) => ({
      date: bucket.key_as_string ?? '',
      timestamp: bucket.key,
      completed: bucket.completed?.doc_count ?? 0,
      failed: bucket.failed?.doc_count ?? 0,
      cancelled: bucket.cancelled?.doc_count ?? 0,
    }));
  } catch (error) {
    if (!isIndexNotFoundError(error)) {
      deps.logger.error('Failed to get execution history stats', { error: error as Error });
    } else {
      deps.logger.warn(
        `Executions index not found when fetching execution history stats: ${
          (error as Error).message
        }`
      );
    }
    return [];
  }
};
