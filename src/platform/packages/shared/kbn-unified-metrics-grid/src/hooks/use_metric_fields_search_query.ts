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
import { useEffect, useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useMetricsExperienceClient } from '../context/metrics_experience_client_provider/use_metrics_experience_client';

/**
 * Separate hook for searching/filtering fields with kuery.
 * Used when value filters are applied to optimize performance by passing a specific field list.
 */
export const useMetricFieldsSearchQuery = (params?: {
  fields: string[];
  index: string;
  timeRange: TimeRange | undefined;
  kuery: string;
  enabled?: boolean;
}) => {
  const { client } = useMetricsExperienceClient();

  const { hasNextPage, data, status, fetchNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: [
        'metricFieldsSearch',
        params?.fields,
        params?.index,
        params?.timeRange?.from,
        params?.timeRange?.to,
        params?.kuery,
      ],
      queryFn: async ({
        queryKey,
        pageParam = 1,
        signal,
      }: QueryFunctionContext<[string, string[]?, string?, string?, string?, string?], number>) => {
        try {
          const [, fields, index, from, to, kuery] = queryKey;

          const response = await client.searchFields(
            {
              fields,
              index,
              from,
              to,
              page: pageParam,
              size: 200,
              kuery,
            },
            signal
          );

          if (!response) {
            throw new Error(`Failed to search fields for ${index}`);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
      enabled: params?.enabled !== false,
      keepPreviousData: true,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return;
        if (lastPage?.fields.length === 0) return;
        return lastPage?.page + 1;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes - search results are more dynamic
    });

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage, isFetchingNextPage]);

  const metricFieldsData = useMemo(() => {
    return data?.pages?.filter(Boolean).flatMap((page) => page.fields) ?? [];
  }, [data]);

  return {
    data: metricFieldsData,
    status,
    isFetching,
  };
};
