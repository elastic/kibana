/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { QueryFunctionContext, useInfiniteQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useEffect, useMemo } from 'react';
import { MetricField } from '../types';

interface MetricFieldsApiResponse {
  fields: MetricField[];
  total: number;
  page: number;
}

export const useMetricFieldsQuery = (params?: {
  fields?: string[];
  index: string;
  from?: string;
  to?: string;
}) => {
  const {
    services: { http },
  } = useKibana();

  const { hasNextPage, data, status, fetchNextPage, isLoading, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['metricFields', params?.fields, params?.index, params?.from, params?.to],
      queryFn: async ({
        queryKey,
        pageParam = 1,
      }: QueryFunctionContext<[string, string[]?, string?, string?, string?]>): Promise<
        MetricFieldsApiResponse | undefined
      > => {
        try {
          const [, fields, index, from, to] = queryKey;
          const url = '/internal/metrics_experience/fields';
          const response = await http?.get<MetricFieldsApiResponse>(url, {
            query: {
              fields,
              index,
              from,
              to,
              page: pageParam,
              size: 200,
            },
          });

          if (!response) {
            throw new Error(`Failed to fetch fields for ${index}`);
          }

          return response;
        } catch (error) {
          throw error;
        }
      },
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
    const fieldData: MetricField[] = [];
    if (data) {
      for (const page of data?.pages) {
        if (page) {
          fieldData.push(...page.fields);
        }
      }
      return fieldData;
    }
  }, [data]);

  return { data: metricFieldsData, status, isLoading };
};
