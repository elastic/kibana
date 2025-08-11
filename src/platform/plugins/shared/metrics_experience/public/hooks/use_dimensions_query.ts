/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HttpStart } from '@kbn/core/public';

interface DimensionValue {
  value: string;
  field: string;
}

interface DimensionsRequest {
  http?: HttpStart;
  dimensions: string[];
  indices?: string[];
  from?: string;
  to?: string;
}

interface DimensionsResponse {
  values: DimensionValue[];
}

const fetchDimensionValues = async ({
  http,
  ...rest
}: DimensionsRequest): Promise<DimensionValue[]> => {
  const response = await http?.post<DimensionsResponse>('/internal/metrics_experience/dimensions', {
    body: JSON.stringify(rest),
  });

  return response?.values || [];
};

export const useDimensionsQuery = (params: {
  dimensions: string[];
  indices?: string[];
  from?: string;
  to?: string;
}) => {
  const {
    services: { http },
  } = useKibana();
  return useQuery({
    queryKey: ['dimensionValues', params],
    queryFn: () => fetchDimensionValues({ ...params, http }),
    enabled: params.dimensions.length > 0, // Only fetch when dimensions are selected
    staleTime: 5 * 60 * 1000, // 5 minutes - dimension values change more frequently than fields
  });
};
