/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryFunctionContext } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';
import { useMetricsExperienceClient } from '../context/metrics_experience_client_provider';
import { usePaginatedMetricFieldsQuery } from './use_paginated_metric_fields_query';

export const useMetricFieldsQuery = (params?: {
  index: string;
  timeRange: TimeRange | undefined;
}) => {
  const { client } = useMetricsExperienceClient();

  return usePaginatedMetricFieldsQuery({
    queryKey: [
      'metricFields',
      params?.index,
      params?.timeRange?.from,
      params?.timeRange?.to,
    ] as const,
    queryFn: async ({
      queryKey,
      pageParam = 1,
      signal,
    }: QueryFunctionContext<readonly [string, string?, string?, string?], number>) => {
      try {
        const [, index, from, to] = queryKey;

        const response = await client.getFields(
          {
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
  });
};
