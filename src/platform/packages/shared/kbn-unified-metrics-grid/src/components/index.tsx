/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MetricsExperienceClient } from '@kbn/metrics-experience-plugin/public';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import { MetricsExperienceClientProvider } from '../context/metrics_experience_client_provider';
import { withRestorableState } from '../restorable_state';
import { MetricsExperienceStateProvider } from '../context/metrics_experience_state_provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const InternalUnifiedMetricsExperienceGrid = (
  props: ChartSectionProps & { client?: MetricsExperienceClient }
) => {
  if (!props.client) {
    return null;
  }

  return (
    <MetricsExperienceClientProvider value={{ client: props.client }}>
      <MetricsExperienceStateProvider>
        <QueryClientProvider client={queryClient}>
          <MetricsExperienceGrid {...props} />
        </QueryClientProvider>
      </MetricsExperienceStateProvider>
    </MetricsExperienceClientProvider>
  );
};

const UnifiedMetricsExperienceGridWithRestorableState = withRestorableState(
  InternalUnifiedMetricsExperienceGrid
);

// eslint-disable-next-line import/no-default-export
export default UnifiedMetricsExperienceGridWithRestorableState;
