/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { MetricsGridSection } from './components/metrics_grid_section';
import { store } from './store';
import { MetricsExperienceProvider } from './context/metrics_experience_provider';
import type { MetricsExperienceService } from './types';

interface ApplicationProps {
  appMountParameters: AppMountParameters;
  coreStart: CoreStart;

  service: MetricsExperienceService;
}

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

export const Application = ({ coreStart, service }: ApplicationProps) => {
  return (
    <KibanaContextProvider services={coreStart}>
      <MetricsExperienceProvider value={service}>
        <Provider store={store}>
          <QueryClientProvider client={queryClient}>
            <MetricsGridSection
              indexPattern="metrics-*"
              timeRange={{ from: 'now-1h', to: 'now' }}
            />
          </QueryClientProvider>
        </Provider>
      </MetricsExperienceProvider>
    </KibanaContextProvider>
  );
};
