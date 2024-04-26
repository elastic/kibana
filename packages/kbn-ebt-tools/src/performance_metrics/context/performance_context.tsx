/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useMemo, useState } from 'react';
import { ttfmpPerfomanceMarkers } from '../performance_markers';
import { useLocation } from 'react-router-dom';
import afterFrame from '../after_frame';

function measureInteraction() {
  performance.mark(ttfmpPerfomanceMarkers.startPageChange);

  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     */
    pageReady(pathname: string) {
      performance.mark(ttfmpPerfomanceMarkers.endPageReady);

      // Time To First Meaningful Paint (ttfmp)

      performance.measure(pathname, {
        detail: { eventName: 'TTFMP' },
        start: ttfmpPerfomanceMarkers.startPageChange,
        end: ttfmpPerfomanceMarkers.endPageReady,
      });
    },
  };
}

interface PerformanceApi {
  onPageReady(): void;
}

export const PerformanceContext = createContext<PerformanceApi | undefined>(undefined);

export function PerformanceContextProvider({ children }: { children: React.ReactElement }) {
  const [isBrowserReady, setIsBrowserReady] = useState<Boolean>(false);
  const location = useLocation();
  const interaction = measureInteraction();

  React.useEffect(() => {
    afterFrame(() => {
      setIsBrowserReady(true);
    });
    return () => {
      setIsBrowserReady(false);
    };
  }, [location.pathname]);

  const api = useMemo<PerformanceApi>(
    () => ({
      onPageReady() {
        if (isBrowserReady) {
          interaction.pageReady(location.pathname);
        }
      },
    }),
    [isBrowserReady, location.pathname]
  );

  return <PerformanceContext.Provider value={api}>{children}</PerformanceContext.Provider>;
}
