/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import type { TimeRange } from '@kbn/es-query';
import type { SortOrder } from '@kbn/unified-data-table';
import {
  mergeEsHitPages,
  resolveHitSearchHasMoreHits,
  resolveHitSearchTableLoadingState,
} from './workflow_execute_hit_search_pagination';
import { serializeWorkflowExecuteHitSortOrder } from './workflow_execute_hit_search_sort';

export interface WorkflowExecuteHitSearchPageResult {
  pageHits: EsHitRecord[];
  total: number;
}

export interface UseWorkflowExecuteHitSearchOptions {
  enabled: boolean;
  searchIdentityKey: string;
  fetchPage: (pageIndex: number) => Promise<WorkflowExecuteHitSearchPageResult>;
  setErrors: (errors: string | null) => void;
  resolveFetchError: (error: unknown) => string;
}

export function buildWorkflowExecuteHitSearchIdentityKey(params: {
  dataViewId: string | undefined;
  submittedQueryString: string;
  timeRange: TimeRange;
  tableSort: SortOrder[];
}): string {
  const sortKey = serializeWorkflowExecuteHitSortOrder(params.tableSort);
  return `${params.dataViewId ?? ''}|${params.submittedQueryString}|${params.timeRange.from}|${
    params.timeRange.to
  }|${sortKey}`;
}

export function useWorkflowExecuteHitSearch({
  enabled,
  searchIdentityKey,
  fetchPage,
  setErrors,
  resolveFetchError,
}: UseWorkflowExecuteHitSearchOptions) {
  const [hits, setHits] = useState<EsHitRecord[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [lastPageHitsLength, setLastPageHitsLength] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setPageIndex(0);
    setHits([]);
    setTotalHits(0);
    setLastPageHitsLength(0);
  }, [searchIdentityKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const runFetch = async () => {
      setIsFetching(true);
      setErrors(null);

      try {
        const { pageHits, total } = await fetchPage(pageIndex);
        if (cancelled) {
          return;
        }

        setTotalHits(total);
        setLastPageHitsLength(pageHits.length);
        setHits((previousHits) => mergeEsHitPages(previousHits, pageHits, pageIndex));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrors(resolveFetchError(error));
        if (pageIndex === 0) {
          setHits([]);
          setTotalHits(0);
          setLastPageHitsLength(0);
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    };

    void runFetch();

    return () => {
      cancelled = true;
    };
  }, [enabled, searchIdentityKey, pageIndex, fetchPage, resolveFetchError, setErrors]);

  const resetPageIndex = useCallback(() => {
    setPageIndex(0);
  }, []);

  const hasMoreHits = resolveHitSearchHasMoreHits({
    totalHits,
    accumulatedHitsLength: hits.length,
    currentPageHitsLength: lastPageHitsLength,
  });

  const onFetchMoreRecords = useMemo(
    () => (hasMoreHits && !isFetching ? () => setPageIndex((page) => page + 1) : undefined),
    [hasMoreHits, isFetching]
  );

  const tableLoadingState = resolveHitSearchTableLoadingState(isFetching, hits.length);

  return {
    hits,
    totalHits,
    isFetching,
    tableLoadingState,
    onFetchMoreRecords,
    resetPageIndex,
  };
}
