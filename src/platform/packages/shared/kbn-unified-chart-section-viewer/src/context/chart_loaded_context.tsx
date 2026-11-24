/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';
import type { ChartSectionProps } from '@kbn/unified-histogram/types';

type PanelState = 'loading' | 'loaded' | 'empty' | 'removed';
type ReportPanel = (panelId: string, state: PanelState) => void;

const ChartLoadedContext = createContext<ReportPanel | undefined>(undefined);

/**
 * Combines the state of all chart panels of a section into one `onChartLoaded` report:
 * as soon as one panel has data, or once all panels finished without data.
 */
export const ChartLoadedProvider = ({
  onChartLoaded,
  children,
}: {
  onChartLoaded: ChartSectionProps['onChartLoaded'];
  children: ReactNode;
}) => {
  const search = useRef({ onChartLoaded, panelStates: new Map<string, PanelState>() });

  const reportPanel = useCallback<ReportPanel>(
    (panelId, state) => {
      if (search.current.onChartLoaded !== onChartLoaded) {
        // a new callback means a new search, panels report again when they reload
        search.current = { onChartLoaded, panelStates: new Map() };
      }

      const { panelStates } = search.current;
      if (state === 'removed') {
        panelStates.delete(panelId);
      } else {
        panelStates.set(panelId, state);
      }

      const states = [...panelStates.values()];
      if (states.includes('loaded')) {
        onChartLoaded?.();
      } else if (states.length > 0 && !states.includes('loading')) {
        onChartLoaded?.({ isEmpty: true });
      }
    },
    [onChartLoaded]
  );

  return (
    <ChartLoadedContext.Provider value={onChartLoaded ? reportPanel : undefined}>
      {children}
    </ChartLoadedContext.Provider>
  );
};

/** Returns the function a chart panel uses to report its state, if the section wants reports. */
export const useReportChartPanel = (): ReportPanel | undefined => useContext(ChartLoadedContext);
