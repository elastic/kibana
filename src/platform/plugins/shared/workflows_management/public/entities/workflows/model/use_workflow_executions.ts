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
import type { ExecutionStatus, ExecutionType, WorkflowExecutionListDto } from '@kbn/workflows';
import { useKibana } from '../../../hooks/use_kibana';

const DEFAULT_PAGE_SIZE = 100;
const MAX_RETRIES = 3;

interface UseWorkflowExecutionsParams {
  workflowId: string | null;
  statuses?: ExecutionStatus[];
  executionTypes?: ExecutionType[];
  executedBy?: string[];
  size?: number;
}

export function useWorkflowExecutions(
  params: UseWorkflowExecutionsParams,
  options: Omit<
    UseInfiniteQueryOptions<
      WorkflowExecutionListDto,
      unknown,
      WorkflowExecutionListDto,
      WorkflowExecutionListDto,
      (string | number | ExecutionStatus[] | ExecutionType[] | string[] | null | undefined)[]
    >,
    'queryKey' | 'queryFn' | 'getNextPageParam'
  > = {}
) {
  const { http } = useKibana().services;
  const currentSize = params.size ?? DEFAULT_PAGE_SIZE;

  const queryFn = useCallback(
    async ({ pageParam = 1 }: { pageParam?: number }) => {
      return http.get<WorkflowExecutionListDto>(`/api/workflowExecutions`, {
        query: {
          workflowId: params.workflowId,
          statuses: params.statuses,
          executionTypes: params.executionTypes,
          ...(params.executedBy && params.executedBy.length > 0
            ? { executedBy: params.executedBy }
            : {}),
          page: pageParam,
          size: currentSize,
        },
      });
    },
    [
      http,
      params.workflowId,
      params.statuses,
      params.executionTypes,
      params.executedBy,
      currentSize,
    ]
  );

  const getNextPageParam = useCallback((lastPage: WorkflowExecutionListDto) => {
    const { page, size, total } = lastPage;
    const totalPages = Math.ceil(total / size);

    if (page >= totalPages) {
      return undefined;
    }

    return page + 1;
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetched,
    isFetching,
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
      currentSize,
    ],
    queryFn,
    getNextPageParam,
    enabled: params.workflowId !== null,
    retry: MAX_RETRIES,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });

  // Computed loading states for better semantics
  const isLoadingMore = isFetching && !isInitialLoading;

  // Flatten all pages into a single list
  const allExecutions = useMemo<WorkflowExecutionListDto | null>(() => {
    if (!data?.pages?.length) {
      return null;
    }

    const firstPage = data.pages[0];
    const allResults = data.pages.flatMap((page) => page.results);

    return {
      results: allResults,
      page: data.pages.length, // Number of pages loaded
      size: firstPage.size, // Keep original page size
      total: firstPage.total, // Total available
    };
  }, [data]);

  // IntersectionObserver setup for infinite scroll
  const observerRef = useRef<IntersectionObserver>();
  const fetchNext = useCallback(
    async ([{ isIntersecting }]: IntersectionObserverEntry[]) => {
      if (isIntersecting && hasNextPage && !isInitialLoading && !isFetching) {
        await fetchNextPage();
        // Don't disconnect - the observer will be reattached to the new last element
      }
    },
    [fetchNextPage, hasNextPage, isFetching, isInitialLoading]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  // Attaches an intersection observer to the last element
  // to trigger a callback to paginate when the user scrolls to it
  const setPaginationObserver = useCallback(
    (ref: HTMLDivElement | null) => {
      observerRef.current?.disconnect();

      if (!ref) {
        return;
      }

      observerRef.current = new IntersectionObserver(fetchNext, {
        root: null,
        rootMargin: '0px',
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
    hasNextPage,
    error,
    refetch,
    setPaginationObserver,
  };
}
