/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@kbn/react-query';
import { useMetricsExperience } from './use_metrics_experience';

export const useDimensionsQuery = (params: {
  dimensions: string[];
  indices?: string[];
  from?: string;
  to?: string;
}) => {
  const { client } = useMetricsExperience();

  return useQuery({
    queryKey: ['dimensionValues', params],
    queryFn: async ({ signal }) => {
      const { dimensions, ...rest } = params;
      const response = await client.getDimensions(
        {
          dimensions: JSON.stringify(dimensions),
          ...rest,
        },
        signal
      );

      return response?.values || [];
    },
    enabled: params.dimensions.length > 0, // Only fetch when dimensions are selected
    staleTime: 5 * 60 * 1000, // 5 minutes - dimension values change more frequently than fields
  });
};
