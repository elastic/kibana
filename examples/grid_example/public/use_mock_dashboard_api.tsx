/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import { v4 } from 'uuid';

import type { TimeRange } from '@kbn/es-query';

import type { ViewMode, PanelPackage } from '@kbn/presentation-publishing';
import type {
  MockDashboardApi,
  MockSerializedDashboardState,
  MockedDashboardPanelMap,
  MockedDashboardSectionMap,
} from './types';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;
const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const useMockDashboardApi = ({
  savedState,
}: {
  savedState: MockSerializedDashboardState;
}): MockDashboardApi => {
  const mockDashboardApi = useMemo(() => {
    const panels$ = new BehaviorSubject<MockedDashboardPanelMap>(savedState.panels);
    const expandedPanelId$ = new BehaviorSubject<string | undefined>(undefined);
    const viewMode$ = new BehaviorSubject<ViewMode>('edit');

    return {
      getSerializedStateForChild: (id: string) => {
        return panels$.getValue()[id].explicitInput;
      },
      children$: new BehaviorSubject({}),
      timeRange$: new BehaviorSubject<TimeRange>({
        from: 'now-24h',
        to: 'now',
      }),
      filters$: new BehaviorSubject([]),
      query$: new BehaviorSubject(''),
      viewMode$,
      setViewMode: (viewMode: ViewMode) => viewMode$.next(viewMode),
      panels$,
      getPanelCount: () => {
        return Object.keys(panels$.getValue()).length;
      },
      sections$: new BehaviorSubject<MockedDashboardSectionMap>(savedState.sections),
      expandedPanelId$,
      expandPanel: (id: string) => {
        if (expandedPanelId$.getValue()) {
          expandedPanelId$.next(undefined);
        } else {
          expandedPanelId$.next(id);
        }
      },
      removePanel: (id: string) => {
        const panels = { ...mockDashboardApi.panels$.getValue() };
        delete panels[id]; // the grid layout component will handle compacting, if necessary
        mockDashboardApi.panels$.next(panels);
      },
      replacePanel: async (id: string, newPanel: PanelPackage): Promise<string> => {
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        const oldPanel = currentPanels[id];
        delete otherPanels[id];
        const newId = v4();
        otherPanels[newId] = {
          ...oldPanel,
          explicitInput: { ...(newPanel.serializedState ?? {}), id: newId },
        };
        mockDashboardApi.panels$.next(otherPanels);
        return newId;
      },
      addNewPanel: async (panelPackage: PanelPackage): Promise<undefined> => {
        // we are only implementing "place at top" here, for demo purposes
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        for (const [id, panel] of Object.entries(currentPanels)) {
          const currentPanel = cloneDeep(panel);
          currentPanel.gridData.y = currentPanel.gridData.y + DEFAULT_PANEL_HEIGHT;
          otherPanels[id] = currentPanel;
        }
        const newId = panelPackage.maybePanelId ?? v4();
        mockDashboardApi.panels$.next({
          ...otherPanels,
          [newId]: {
            type: panelPackage.panelType,
            gridData: {
              x: 0,
              y: 0,
              w: DEFAULT_PANEL_WIDTH,
              h: DEFAULT_PANEL_HEIGHT,
              i: newId,
            },
            explicitInput: {
              ...(panelPackage.serializedState ?? {}),
              id: newId,
            },
          },
        });
      },
      canRemovePanels: () => true,
      getChildApi: () => {
        throw new Error('getChildApi implemenation not provided');
      },
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return mockDashboardApi;
};
