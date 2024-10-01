/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useMemo, useContext } from 'react';
import { PerformanceContextProvider, usePerformanceContext } from '@kbn/ebt-tools';

interface DiscoverEBTPerformanceContextProps {
  onTrackPluginRenderTime: (props?: {
    hits?: { totalHits: number | undefined; fetchedHits: number; sampleSize: number };
  }) => void; // track when the main plugin content is rendered (data grid or single doc view)
  onSkipPluginRenderTime: () => void; // ignore and skip tracking the main plugin content render time if the initial render had secondary content (error, empty, etc)
}

const DiscoverEBTPerformanceContext = createContext<DiscoverEBTPerformanceContextProps>({
  onTrackPluginRenderTime: () => {},
  onSkipPluginRenderTime: () => {},
});

export const useDiscoverEBTPerformanceContext = () => {
  return useContext(DiscoverEBTPerformanceContext);
};

const DiscoverPluginRenderTimeProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { onPageReady } = usePerformanceContext();
  const shouldTrackPluginRenderTimeRef = React.useRef<boolean>(true);

  const onTrackPluginRenderTime: DiscoverEBTPerformanceContextProps['onTrackPluginRenderTime'] =
    React.useCallback(
      ({ hits } = {}) => {
        if (!shouldTrackPluginRenderTimeRef.current) {
          return;
        }
        shouldTrackPluginRenderTimeRef.current = false; // only once
        onPageReady(
          hits
            ? {
                key1: 'sampleSize',
                value1: hits.sampleSize,
                key2: 'fetchedHits',
                value2: hits.fetchedHits,
                ...(hits.totalHits
                  ? {
                      key3: 'totalHits',
                      value3: hits.totalHits,
                    }
                  : {}),
              }
            : undefined
        );
      },
      [onPageReady]
    );

  const onSkipPluginRenderTime: DiscoverEBTPerformanceContextProps['onSkipPluginRenderTime'] =
    React.useCallback(() => {
      shouldTrackPluginRenderTimeRef.current = false;
    }, []);

  const value = useMemo(
    () => ({ onTrackPluginRenderTime, onSkipPluginRenderTime }),
    [onTrackPluginRenderTime, onSkipPluginRenderTime]
  );

  return (
    <DiscoverEBTPerformanceContext.Provider value={value}>
      {children}
    </DiscoverEBTPerformanceContext.Provider>
  );
};

export const DiscoverEBTPerformanceProvider: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return (
    <PerformanceContextProvider>
      <DiscoverPluginRenderTimeProvider>{children}</DiscoverPluginRenderTimeProvider>
    </PerformanceContextProvider>
  );
};
