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

import {
  MockSerializedDashboardState,
  MockedDashboardPanelMap,
  MockedDashboardRowMap,
} from './types';

const DASHBOARD_GRID_COLUMN_COUNT = 48;
const DEFAULT_PANEL_HEIGHT = 15;
const DEFAULT_PANEL_WIDTH = DASHBOARD_GRID_COLUMN_COUNT / 2;

export const useMockDashboardApi = ({
  savedState,
}: {
  savedState: MockSerializedDashboardState;
}) => {
  const mockDashboardApi = useMemo(() => {
    return {
      viewMode: new BehaviorSubject('edit'),
      panels$: new BehaviorSubject<MockedDashboardPanelMap>(savedState.panels),
      rows$: new BehaviorSubject<MockedDashboardRowMap>(savedState.rows),
      removePanel: (id: string) => {
        const panels = { ...mockDashboardApi.panels$.getValue() };
        delete panels[id]; // the grid layout component will handle compacting, if necessary
        mockDashboardApi.panels$.next(panels);
      },
      replacePanel: (oldId: string, newId: string) => {
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        const oldPanel = currentPanels[oldId];
        delete otherPanels[oldId];
        otherPanels[newId] = { id: newId, gridData: { ...oldPanel.gridData, i: newId } };
        mockDashboardApi.panels$.next(otherPanels);
      },
      addNewPanel: ({ id: newId }: { id: string }) => {
        // we are only implementing "place at top" here, for demo purposes
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        for (const [id, panel] of Object.entries(currentPanels)) {
          const currentPanel = cloneDeep(panel);
          currentPanel.gridData.y = currentPanel.gridData.y + DEFAULT_PANEL_HEIGHT;
          otherPanels[id] = currentPanel;
        }
        mockDashboardApi.panels$.next({
          ...otherPanels,
          [newId]: {
            id: newId,
            gridData: {
              i: newId,
              row: 0,
              x: 0,
              y: 0,
              w: DEFAULT_PANEL_WIDTH,
              h: DEFAULT_PANEL_HEIGHT,
            },
          },
        });
      },
      canRemovePanels: () => true,
    };
    // only run onMount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return mockDashboardApi;
};
