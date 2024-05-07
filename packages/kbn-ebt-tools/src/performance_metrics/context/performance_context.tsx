/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { createContext, useMemo, useState } from 'react';
import { afterFrame } from '@elastic/apm-rum-core';
import { perfomanceMarkers } from '../performance_markers';
import { useLocation } from 'react-router-dom';

function measureInteraction() {
  performance.mark(perfomanceMarkers.startPageChange);
  const trackedRoutes: string[] = [];
  return {
    /**
     * Marks the end of the page ready state and measures the performance between the start of the page change and the end of the page ready state.
     * @param pathname - The pathname of the page.
     */
    pageReady(pathname: string) {
      performance.mark(perfomanceMarkers.endPageReady);

      if (!trackedRoutes.includes(pathname)) {
        performance.measure(pathname, {
          detail: { eventName: 'kibana:plugin_render_time', type: 'kibana:performance' },
          start: perfomanceMarkers.startPageChange,
          end: perfomanceMarkers.endPageReady,
        });
        trackedRoutes.push(pathname);
      }
    },
  };
}

interface PerformanceApi {
  onPageReady(): void;
}

export const PerformanceContext = createContext<PerformanceApi | undefined>(undefined);

export function PerformanceContextProvider({ children }: { children: React.ReactElement }) {
  const [isRendered, setIsRendered] = useState<Boolean>(false);
  const location = useLocation();
  const interaction = measureInteraction();

  React.useEffect(() => {
    afterFrame(() => {
      setIsRendered(true);
    });
    return () => {
      setIsRendered(false);
    };
  }, [location.pathname]);

  const api = useMemo<PerformanceApi>(
    () => ({
      onPageReady() {
        if (isRendered) {
          interaction.pageReady(location.pathname);
        }
      },
    }),
    [isRendered, location.pathname]
  );

  return <PerformanceContext.Provider value={api}>{children}</PerformanceContext.Provider>;
}
