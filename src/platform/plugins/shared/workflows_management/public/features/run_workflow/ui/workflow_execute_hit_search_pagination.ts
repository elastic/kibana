/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsHitRecord } from '@kbn/discover-utils/types';
import { DataLoadingState } from '@kbn/unified-data-table';
import { resolveWorkflowsEventsHasMoreHits } from './trigger_event_search_totals';

export const WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE = 50;

export function parseSearchTotalHits(total: unknown): number {
  if (typeof total === 'number') {
    return total;
  }
  if (total && typeof total === 'object' && 'value' in total) {
    const value = (total as { value: number }).value;
    return typeof value === 'number' ? value : 0;
  }
  return 0;
}

export function getEsHitRecordDedupKey(hit: EsHitRecord): string | undefined {
  if (!hit._id || !hit._index) {
    return undefined;
  }

  return `${hit._index}::${hit._id}`;
}

export function mergeEsHitPages(
  previousHits: EsHitRecord[],
  pageHits: EsHitRecord[],
  pageIndex: number
): EsHitRecord[] {
  if (pageIndex === 0) {
    return pageHits;
  }

  const seen = new Set(
    previousHits
      .map(getEsHitRecordDedupKey)
      .filter((dedupKey): dedupKey is string => dedupKey !== undefined)
  );

  const appended = pageHits.filter((hit) => {
    const dedupKey = getEsHitRecordDedupKey(hit);
    if (!dedupKey) {
      return true;
    }
    return !seen.has(dedupKey);
  });

  return appended.length === 0 ? previousHits : previousHits.concat(appended);
}

export function resolveHitSearchHasMoreHits(params: {
  totalHits: number;
  accumulatedHitsLength: number;
  currentPageHitsLength: number;
}): boolean {
  return resolveWorkflowsEventsHasMoreHits({
    ...params,
    pageSize: WORKFLOW_EXECUTE_HIT_SEARCH_PAGE_SIZE,
  });
}

export function resolveHitSearchTableLoadingState(
  isFetching: boolean,
  accumulatedHitsLength: number
): DataLoadingState {
  if (isFetching && accumulatedHitsLength === 0) {
    return DataLoadingState.loading;
  }
  if (isFetching && accumulatedHitsLength > 0) {
    return DataLoadingState.loadingMore;
  }
  return DataLoadingState.loaded;
}
