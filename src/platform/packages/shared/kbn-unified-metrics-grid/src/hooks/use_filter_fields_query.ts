/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import type { TimeRange } from '@kbn/es-query';
import { useMetricsExperienceClient } from '../context/metrics_experience_client_provider';

export const useFilterFieldsQuery = (params: {
  kuery?: string;
  fields: { name: string; index: string }[];
  timeRange: TimeRange | undefined;
}) => {
  const { client } = useMetricsExperienceClient();

  return useQuery({
    queryKey: [
      'filterFields',
      params.kuery,
      params.fields.map((field) => `${field.name}>${field.index}`).join(','),
      params.timeRange?.from,
      params.timeRange?.to,
    ],
    queryFn: async ({ signal }) => {
      const { kuery, fields, timeRange } = params;
      const response = await client.filterFields(
        {
          kuery: kuery || '',
          fields,
          from: timeRange?.from,
          to: timeRange?.to,
        },
        signal
      );

      return response?.fields || [];
    },
    keepPreviousData: true,
    enabled: params.kuery?.trim() !== '', // Only fetch when kuery filter is provided
    staleTime: 5 * 60 * 1000, // 5 minutes - dimension values change more frequently than fields
  });
};
