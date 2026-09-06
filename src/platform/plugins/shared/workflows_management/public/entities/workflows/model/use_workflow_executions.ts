/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery, type UseInfiniteQueryOptions } from '@kbn/react-query';
import type {
  ExecutionStatus,
  ExecutionType,
  WorkflowExecutionListDto,
  WorkflowExecutionSortField,
  WorkflowExecutionSortOrder,
} from '@kbn/workflows';
import { useWorkflowsApi } from '@kbn/workflows-ui';

/** Window size for cursor-based infinite scroll (newest-first). */
const DEFAULT_PAGE_SIZE = 50;
const MAX_RETRIES = 3;
/** Prefetch when the sentinel is within ~2 windows of the viewport. */
const SCROLL_ROOT_MARGIN = '800px';

interface UseWorkflowExecutionsParams {
  /** Workflow ID. */
  workflowId: string | null;
  /** Filter by execution status. */
  statuses?: ExecutionStatus[];
  /** Filter by execution type. */
  executionTypes?: ExecutionType[];
  /** Filter by the user who triggered the execution. */
  executedBy?: string[];
  /** Number of results per page. */
  size?: number;
  /** Whether to omit single-step runs from the results. */
  omitStepRuns?: boolean;
  /** Datemath lower bound for filtering by startedAt (e.g. 'now-1w'). */
  startedAfter?: string;
  /** Datemath upper bound for filtering by startedAt (e.g. 'now'). */
  startedBefore?: string;
  finishedAfter?: string;
  finishedBefore?: string;
  sortField?: WorkflowExecutionSortField;
  sortOrder?: WorkflowExecutionSortOrder;
}

type ExecutionsPageParam = { searchAfter?: unknown[] } | undefined;

export function useWorkflowExecutions(
  params: UseWorkflowExecutionsParams,
  options: Omit<
    UseInfiniteQueryOptions<
      WorkflowExecutionListDto,
      unknown,
      WorkflowExecutionListDto,
      WorkflowExecutionListDto,
      (
        | string
        | number
        | boolean
        | ExecutionStatus[]
        | ExecutionType[]
        | string[]
        | null
        | undefined
      )[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  > = {}
) {
  const api = useWorkflowsApi();
  const currentSize = params.size ?? DEFAULT_PAGE_SIZE;

  const queryFn = useCallback(
    async ({ pageParam }: { pageParam?: ExecutionsPageParam }) => {
      if (!params.workflowId) {
        throw new Error('Workflow ID is required');
      }
      const searchAfter = pageParam?.searchAfter;
      return api.getWorkflowExecutions(params.workflowId, {
        statuses: params.statuses,
        executionTypes: params.executionTypes,
        ...(params.executedBy && params.executedBy.length > 0
          ? { executedBy: params.executedBy }
          : {}),
        ...(params.omitStepRuns != null && { omitStepRuns: params.omitStepRuns }),
        ...(params.startedAfter != null && params.startedAfter !== ''
          ? { startedAfter: params.startedAfter }
          : {}),
        ...(params.startedBefore != null && params.startedBefore !== ''
          ? { startedBefore: params.startedBefore }
          : {}),
        ...(params.finishedAfter ? { finishedAfter: params.finishedAfter } : {}),
        ...(params.finishedBefore ? { finishedBefore: params.finishedBefore } : {}),
        ...(params.sortField ? { sortField: params.sortField } : {}),
        ...(params.sortOrder ? { sortOrder: params.sortOrder } : {}),
        ...(searchAfter && searchAfter.length > 0
          ? { searchAfter: JSON.stringify(searchAfter) }
          : { page: 1 }),
        size: currentSize,
      });
    },
    [
      api,
      params.workflowId,
      params.statuses,
      params.executionTypes,
      params.executedBy,
      params.omitStepRuns,
      params.startedAfter,
      params.startedBefore,
      params.finishedAfter,
      params.finishedBefore,
      params.sortField,
      params.sortOrder,
      currentSize,
    ]
  );

  const getNextPageParam = useCallback(
    (lastPage: WorkflowExecutionListDto): ExecutionsPageParam => {
      if (!lastPage.searchAfter?.length) {
        return undefined;
      }
      return { searchAfter: lastPage.searchAfter };
    },
    []
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetched,
    isFetching,
    isFetchingNextPage,
    isLoading: isInitialLoading,
    refetch,
    error,
  } = useInfiniteQuery({
    networkMode: 'always',
    queryKey: [
      'workflows',
      params.workflowId,
      'executions',
      params.statuses,
      params.executionTypes,
      params.executedBy,
      params.omitStepRuns,
      params.startedAfter,
      params.startedBefore,
      params.finishedAfter,
      params.finishedBefore,
      params.sortField,
      params.sortOrder,
      currentSize,
    ],
    queryFn,
    getNextPageParam,
    enabled: params.workflowId !== null,
    ...options,
    retry: options.retry ?? MAX_RETRIES,
    retryDelay: options.retryDelay ?? ((attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)),
  });

  // Only true while paginating — not during background poll refetches
  const isLoadingMore = isFetchingNextPage;

  // Flatten all pages into a single list
  const allExecutions = useMemo<WorkflowExecutionListDto | null>(() => {
    if (!data?.pages?.length) {
      return null;
    }

    const firstPage = data.pages[0];
    const lastPage = data.pages[data.pages.length - 1];
    const allResults = data.pages.flatMap((page) => page.results);

    return {
      results: allResults,
      page: data.pages.length,
      size: firstPage.size,
      total: firstPage.total,
      ...(lastPage.searchAfter ? { searchAfter: lastPage.searchAfter } : {}),
    };
  }, [data]);

  // IntersectionObserver setup for infinite scroll
  const observerRef = useRef<IntersectionObserver>();
  const fetchNext = useCallback(
    async ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
      if (isIntersecting && hasNextPage && !isInitialLoading && !isFetching) {
        await fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetching, isInitialLoading]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  const setPaginationObserver = useCallback(
    (ref: HTMLDivElement | null) => {
      observerRef.current?.disconnect();

      if (!ref) {
        return;
      }

      observerRef.current = new IntersectionObserver(fetchNext, {
        root: null,
        rootMargin: SCROLL_ROOT_MARGIN,
        threshold: 0.1,
      });
      observerRef.current.observe(ref);
    },
    [fetchNext]
  );

  return {
    data: allExecutions,
    isInitialLoading,
    isLoadingMore,
    isFetched,
    hasNextPage: Boolean(hasNextPage),
    error,
    refetch,
    setPaginationObserver,
  };
}
