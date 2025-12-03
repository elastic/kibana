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
import type { FieldCapsResponseMap } from '../utils';

export const useMetricFieldsCaps = (params?: {
  index: string;
  timeRange: TimeRange | undefined;
}) => {
  const { client } = useMetricsExperienceClient();
  const index = params?.index;
  const from = params?.timeRange?.from;
  const to = params?.timeRange?.to;

  const canRequest = Boolean(client && index && from && to);

  return useQuery<FieldCapsResponseMap>({
    queryKey: ['metricFieldsCaps', index, from, to] as const,
    queryFn: async ({ queryKey, signal }) => {
      const [, idx, start, end] = queryKey;

      if (!client || !idx || !start || !end) {
        throw new Error('Metric field caps query is missing required parameters.');
      }

      const response = await client.getFieldCaps(
        {
          index: idx,
          from: start,
          to: end,
        },
        signal
      );

      return response;
    },
    enabled: canRequest,
    staleTime: 10 * 60 * 1000, // 10 minutes - field caps don't change often
  });
};
