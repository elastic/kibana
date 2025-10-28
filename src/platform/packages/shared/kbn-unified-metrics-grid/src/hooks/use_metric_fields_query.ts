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

export const useMetricFieldsQuery = (params?: {
  fields?: string[];
  index: string;
  timeRange: TimeRange | undefined;
}) => {
  const { client } = useMetricsExperienceClient();

  const { hasNextPage, data, status, fetchNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery({
      queryKey: [
        'metricFields',
        params?.fields,
        params?.index,
        params?.timeRange?.from,
        params?.timeRange?.to,
      ],
      queryFn: async ({
        queryKey,
        pageParam = 1,
        signal,
      }: QueryFunctionContext<[string, string[]?, string?, string?, string?], number>) => {
        try {
          const [, fields, index, from, to] = queryKey;

          const response = await client.getFields(
            {
              fields,
              index,
              from,
              to,
              page: pageParam,
              size: 200,
            },
            signal
          );

          if (!response) {
            throw new Error(`Failed to fetch fields for ${index}`);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
      keepPreviousData: true,
      getNextPageParam: (lastPage) => {
        if (!lastPage) return;
        if (lastPage?.fields.length === 0) return;
        return lastPage?.page + 1;
      },
      staleTime: 10 * 60 * 1000, // 10 minutes - fields don't change often
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
