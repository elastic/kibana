/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedDashboardPanel } from '../../types';
import { migrateAppState } from './migrate_app_state';

test('migrate app state from 6.0', async () => {
  const appState = {
    uiState: {
      'P-1': { vis: { defaultColors: { '0+-+100': 'rgb(0,104,55)' } } },
    },
    panels: [
      {
        col: 1,
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        row: 1,
        size_x: 6,
        size_y: 3,
        type: 'visualization',
      },
    ],
  };
  migrateAppState(appState as any, '8.0');
  expect(appState.uiState).toBeUndefined();

  const newPanel = (appState.panels[0] as unknown) as SavedDashboardPanel;

  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(15);
  expect(newPanel.gridData.x).toBe(0);
  expect(newPanel.gridData.y).toBe(0);

  expect((newPanel.embeddableConfig as any).vis.defaultColors['0+-+100']).toBe('rgb(0,104,55)');
});

test('migrate sort from 6.1', async () => {
  const TARGET_VERSION = '8.0';
  const appState = {
    uiState: {
      'P-1': { vis: { defaultColors: { '0+-+100': 'rgb(0,104,55)' } } },
    },
    panels: [
      {
        col: 1,
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        row: 1,
        size_x: 6,
        size_y: 3,
        type: 'visualization',
        sort: 'sort',
      },
    ],
    useMargins: false,
  };
  migrateAppState(appState as any, TARGET_VERSION);
  expect(appState.uiState).toBeUndefined();

  const newPanel = (appState.panels[0] as unknown) as SavedDashboardPanel;
  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(15);
  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
  expect((newPanel.embeddableConfig as any).vis.defaultColors['0+-+100']).toBe('rgb(0,104,55)');
});

test('migrates 6.0 even when uiState does not exist', async () => {
  const appState = {
    panels: [
      {
        col: 1,
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        row: 1,
        size_x: 6,
        size_y: 3,
        type: 'visualization',
        sort: 'sort',
      },
    ],
  };
  migrateAppState(appState as any, '8.0');
  expect((appState as any).uiState).toBeUndefined();

  const newPanel = (appState.panels[0] as unknown) as SavedDashboardPanel;
  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(15);
  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
});

test('6.2 migration adjusts w & h without margins', async () => {
  const appState = {
    panels: [
      {
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        gridData: {
          h: 3,
          w: 7,
          x: 2,
          y: 5,
        },
        type: 'visualization',
        sort: 'sort',
        version: '6.2.0',
      },
    ],
    useMargins: false,
  };
  migrateAppState(appState as any, '8.0');
  expect((appState as any).uiState).toBeUndefined();

  const newPanel = (appState.panels[0] as unknown) as SavedDashboardPanel;
  expect(newPanel.gridData.w).toBe(28);
  expect(newPanel.gridData.h).toBe(15);
  expect(newPanel.gridData.x).toBe(8);
  expect(newPanel.gridData.y).toBe(25);
  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
});

test('6.2 migration adjusts w & h with margins', async () => {
  const appState = {
    panels: [
      {
        id: 'Visualization-MetricChart',
        panelIndex: 1,
        gridData: {
          h: 3,
          w: 7,
          x: 2,
          y: 5,
        },
        type: 'visualization',
        sort: 'sort',
        version: '6.2.0',
      },
    ],
    useMargins: true,
  };
  migrateAppState(appState as any, '8.0');
  expect((appState as any).uiState).toBeUndefined();

  const newPanel = (appState.panels[0] as unknown) as SavedDashboardPanel;
  expect(newPanel.gridData.w).toBe(28);
  expect(newPanel.gridData.h).toBe(12);
  expect(newPanel.gridData.x).toBe(8);
  expect(newPanel.gridData.y).toBe(20);
  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
});
