/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import { useInfiniteQuery } from '@kbn/react-query';
import { useEffect, useState } from 'react';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useStableCallback } from '@kbn/unified-histogram/hooks/use_stable_callback';
import usePrevious from 'react-use/lib/usePrevious';
import { PAGE_SIZE } from '../common/constants';

export function filterFieldsWithData(fields: MetricField[]) {
  return fields.filter((field) => !field.noData);
}

interface PaginatedResponse {
  fields: MetricField[];
  page: number;
  total: number;
}

export const usePaginatedMetricFieldsQuery = <TQueryKey extends readonly unknown[]>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: TQueryKey;
  queryFn: (
    context: QueryFunctionContext<TQueryKey, number>
  ) => Promise<PaginatedResponse | undefined>;
  enabled?: boolean;
}) => {
  const { hasNextPage, data, status, fetchNextPage, isFetchingNextPage, isFetching, isRefetching } =
    useInfiniteQuery({
      queryKey,
      queryFn,
      enabled,
      keepPreviousData: true,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return;
        if (lastPage.fields.length === 0 || lastPage.page >= Math.ceil(lastPage.total / PAGE_SIZE))
          return;
        return lastPage.page + 1;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes - fields don't change often
    });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const [response, setResponse] = useState<MetricField[]>();
  const updateResponse = useStableCallback(() => {
    setResponse(data?.pages?.filter(Boolean).flatMap((page) => page?.fields ?? []) ?? []);
  });
  const previousResponse = usePrevious(response);

  useEffect(() => {
    if ((!hasNextPage && !isFetchingNextPage) || !previousResponse?.length) {
      updateResponse();
    }
  }, [hasNextPage, isFetchingNextPage, previousResponse, updateResponse]);

  return {
    data: response,
    status,
    isFetching: hasNextPage || isFetching || isFetchingNextPage || isRefetching,
  };
};
