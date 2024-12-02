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

import { TimeRange } from '@kbn/es-query';
import { PanelPackage } from '@kbn/presentation-containers';

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
    const panels$ = new BehaviorSubject<MockedDashboardPanelMap>(savedState.panels);
    const expandedPanelId$ = new BehaviorSubject<string | undefined>(undefined);

    return {
      getSerializedStateForChild: (id: string) => {
        return {
          rawState: panels$.getValue()[id].explicitInput,
          references: [],
        };
      },
      children$: new BehaviorSubject({}),

      timeRange$: new BehaviorSubject<TimeRange>({
        from: 'now-24h',
        to: 'now',
      }),
      viewMode: new BehaviorSubject('edit'),
      panels$,
      rows$: new BehaviorSubject<MockedDashboardRowMap>(savedState.rows),

      expandedPanelId: expandedPanelId$,
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
      replacePanel: (oldId: string, newId: string) => {
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        const oldPanel = currentPanels[oldId];
        delete otherPanels[oldId];
        otherPanels[newId] = { id: newId, gridData: { ...oldPanel.gridData, i: newId } };
        mockDashboardApi.panels$.next(otherPanels);
      },
      addNewPanel: async (panelPackage: PanelPackage) => {
        // we are only implementing "place at top" here, for demo purposes
        const currentPanels = mockDashboardApi.panels$.getValue();
        const otherPanels = { ...currentPanels };
        for (const [id, panel] of Object.entries(currentPanels)) {
          const currentPanel = cloneDeep(panel);
          currentPanel.gridData.y = currentPanel.gridData.y + DEFAULT_PANEL_HEIGHT;
          otherPanels[id] = currentPanel;
        }
        const newId = v4();
        mockDashboardApi.panels$.next({
          ...otherPanels,
          [newId]: {
            type: panelPackage.panelType,
            gridData: {
              row: 0,
              x: 0,
              y: 0,
              w: DEFAULT_PANEL_WIDTH,
              h: DEFAULT_PANEL_HEIGHT,
              i: newId,
            },
            explicitInput: {
              ...panelPackage.initialState,
              id: newId,
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
