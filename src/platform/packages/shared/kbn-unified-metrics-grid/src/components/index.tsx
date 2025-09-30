/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';
import type { MetricsExperienceClient } from '@kbn/metrics-experience-plugin/public';
import useAsync from 'react-use/lib/useAsync';
import { EmptyState } from './empty_state/empty_state';
import { MetricsExperienceGrid } from './metrics_experience_grid';
import { createReduxStore } from '../store';
import { MetricsExperienceClientProvider } from '../context/metrics_experience_client';
import { TabsProvider } from '../context/tabs';
import { InternalStateProvider, useAppDispatch } from '../store/hooks';
import { initializeTabs } from '../store/actions/tabs';

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

export const UnifiedMetricsExperienceGrid = (
  props: ChartSectionProps & {
    client?: MetricsExperienceClient;
  }
) => {
  const [internalState] = useState(() => createReduxStore());

  const { client, ...propsWithoutClient } = props;
  if (!client) {
    return null;
  }

  return (
    <MetricsExperienceClientProvider value={{ client }}>
      <TabsProvider tabId={propsWithoutClient.currentTabId}>
        <InternalStateProvider store={internalState}>
          <QueryClientProvider client={queryClient}>
            <UnifiedMetricsExperienceGridContent {...propsWithoutClient} />
          </QueryClientProvider>
        </InternalStateProvider>
      </TabsProvider>
    </MetricsExperienceClientProvider>
  );
};

const UnifiedMetricsExperienceGridContent = (props: ChartSectionProps) => {
  const dispatch = useAppDispatch();

  const { tabsState, ...propsWithoutTabsState } = props;

  const tabInitializationState = useAsync(
    async () => await dispatch(initializeTabs({ tabsState })),
    [dispatch, tabsState]
  );

  if (tabInitializationState.loading) {
    return <EmptyState isLoading />;
  }

  return <MetricsExperienceGrid {...propsWithoutTabsState} />;
};

// eslint-disable-next-line import/no-default-export
export default UnifiedMetricsExperienceGrid;
