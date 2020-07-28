/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { migratePanelsTo730 } from './migrate_to_730_panels';
import {
  RawSavedDashboardPanelTo60,
  RawSavedDashboardPanel630,
  RawSavedDashboardPanel640To720,
  RawSavedDashboardPanel610,
  RawSavedDashboardPanel620,
} from './bwc/types';
import { SavedDashboardPanelTo60, SavedDashboardPanel730ToLatest } from './types';

test('6.0 migrates uiState, sort, scales, and gridData', async () => {
  const uiState = {
    'P-1': { vis: { defaultColors: { '0+-+100': 'rgb(0,104,55)' } } },
  };
  const panels: RawSavedDashboardPanelTo60[] = [
    {
      col: 1,
      panelIndex: 1,
      row: 1,
      size_x: 6,
      size_y: 3,
      name: 'panel-123',
      sort: 'sort',
      columns: ['bye'],
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true, uiState);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(12);
  expect(newPanel.version).toBe('8.0.0');

  expect((newPanel as any).sort).toBeUndefined();
  expect((newPanel as any).columns).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
  expect((newPanel.embeddableConfig as any).columns).toEqual(['bye']);
  expect((newPanel.embeddableConfig as any).vis.defaultColors['0+-+100']).toBe('rgb(0,104,55)');
});

test('6.0 migrates even when uiState does not exist', async () => {
  const panels: RawSavedDashboardPanelTo60[] = [
    {
      col: 3,
      panelIndex: 1,
      row: 4,
      size_x: 7,
      size_y: 5,
      sort: 'sort',
      name: 'panel-123',
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(28);
  expect(newPanel.gridData.h).toBe(20);
  expect(newPanel.gridData.x).toBe(8);
  expect(newPanel.gridData.y).toBe(12);
  expect(newPanel.version).toBe('8.0.0');

  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
});

test('6.0 migration gives default width and height when missing', () => {
  const panels: RawSavedDashboardPanelTo60[] = [
    {
      col: 3,
      row: 1,
      panelIndex: 1,
      name: 'panel-123',
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true);
  expect(newPanels[0].gridData.w).toBe(24);
  expect(newPanels[0].gridData.h).toBe(15);
  expect(newPanels[0].version).toBe('8.0.0');
});

test('6.0 migrates old panel data in the right order', () => {
  const createOldPanelData = (
    col: number,
    id: string,
    row: number,
    sizeX: number,
    sizeY: number,
    panelIndex: number
  ) => {
    return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
  };
  const panelData = [
    createOldPanelData(3, 'foo1', 1, 2, 2, 1),
    createOldPanelData(5, 'foo2', 1, 2, 2, 2),
    createOldPanelData(9, 'foo3', 1, 2, 2, 3),
    createOldPanelData(11, 'foo4', 1, 2, 2, 4),
    createOldPanelData(1, 'foo5', 1, 2, 2, 5),
    createOldPanelData(7, 'foo6', 1, 2, 2, 6),
    createOldPanelData(4, 'foo7', 6, 3, 2, 7),
    createOldPanelData(1, 'foo8', 8, 3, 2, 8),
    createOldPanelData(10, 'foo9', 8, 3, 2, 9),
    createOldPanelData(10, 'foo10', 6, 3, 2, 10),
    createOldPanelData(4, 'foo11', 8, 3, 2, 11),
    createOldPanelData(7, 'foo12', 8, 3, 2, 12),
    createOldPanelData(1, 'foo13', 6, 3, 2, 13),
    createOldPanelData(7, 'foo14', 6, 3, 2, 14),
    createOldPanelData(5, 'foo15', 3, 6, 3, 15),
    createOldPanelData(1, 'foo17', 3, 4, 3, 16),
  ];

  const newPanels = migratePanelsTo730(
    panelData,
    '8.0.0',
    false,
    {}
  ) as SavedDashboardPanel730ToLatest[];
  const foo8Panel = newPanels.find((panel) => panel.id === 'foo8');

  expect(foo8Panel).toBeDefined();
  expect((foo8Panel! as any).row).toBe(undefined);
  expect(foo8Panel!.gridData.y).toBe(35);
  expect(foo8Panel!.gridData.x).toBe(0);
});

// We want to run these same panel migrations on URLs, when panels are not in Raw form.
test('6.0 migrations keep id and type properties if they exist', () => {
  const panels: SavedDashboardPanelTo60[] = [
    {
      id: '1',
      panelIndex: '1',
      col: 3,
      row: 1,
      type: 'visualization',
      sort: 'sort',
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', false, {});
  expect((newPanels[0] as SavedDashboardPanel730ToLatest).type).toBe('visualization');
  expect((newPanels[0] as SavedDashboardPanel730ToLatest).id).toBe('1');
});

test('6.0 migrates old panel data in the right order without margins', () => {
  const createOldPanelData = (
    col: number,
    id: string,
    row: number,
    sizeX: number,
    sizeY: number,
    panelIndex: number
  ) => {
    return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
  };
  const panelData = [
    createOldPanelData(3, 'foo1', 1, 2, 2, 1),
    createOldPanelData(5, 'foo2', 1, 2, 2, 2),
    createOldPanelData(9, 'foo3', 1, 2, 2, 3),
    createOldPanelData(11, 'foo4', 1, 2, 2, 4),
    createOldPanelData(1, 'foo5', 1, 2, 2, 5),
    createOldPanelData(7, 'foo6', 1, 2, 2, 6),
    createOldPanelData(4, 'foo7', 6, 3, 2, 7),
    createOldPanelData(1, 'foo8', 8, 3, 2, 8),
    createOldPanelData(10, 'foo9', 8, 3, 2, 9),
    createOldPanelData(10, 'foo10', 6, 3, 2, 10),
    createOldPanelData(4, 'foo11', 8, 3, 2, 11),
    createOldPanelData(7, 'foo12', 8, 3, 2, 12),
    createOldPanelData(1, 'foo13', 6, 3, 2, 13),
    createOldPanelData(7, 'foo14', 6, 3, 2, 14),
    createOldPanelData(5, 'foo15', 3, 6, 3, 15),
    createOldPanelData(1, 'foo17', 3, 4, 3, 16),
  ];

  const newPanels = migratePanelsTo730(
    panelData,
    '8.0.0',
    false,
    {}
  ) as SavedDashboardPanel730ToLatest[];
  const foo8Panel = newPanels.find((panel) => panel.id === 'foo8');

  expect(foo8Panel).toBeDefined();
  expect((foo8Panel! as any).row).toBe(undefined);
  expect(foo8Panel!.gridData.y).toBe(35);
  expect(foo8Panel!.gridData.x).toBe(0);
});

test('6.0 migrates old panel data in the right order with margins', () => {
  const createOldPanelData = (
    col: number,
    id: string,
    row: number,
    sizeX: number,
    sizeY: number,
    panelIndex: number
  ): SavedDashboardPanelTo60 => {
    return { col, id, row, size_x: sizeX, size_y: sizeY, type: 'visualization', panelIndex };
  };
  const panelData: SavedDashboardPanelTo60[] = [
    createOldPanelData(3, 'foo1', 1, 2, 2, 1),
    createOldPanelData(5, 'foo2', 1, 2, 2, 2),
    createOldPanelData(9, 'foo3', 1, 2, 2, 3),
    createOldPanelData(11, 'foo4', 1, 2, 2, 4),
    createOldPanelData(1, 'foo5', 1, 2, 2, 5),
    createOldPanelData(7, 'foo6', 1, 2, 2, 6),
    createOldPanelData(4, 'foo7', 6, 3, 2, 7),
    createOldPanelData(1, 'foo8', 8, 3, 2, 8),
    createOldPanelData(10, 'foo9', 8, 3, 2, 9),
    createOldPanelData(10, 'foo10', 6, 3, 2, 10),
    createOldPanelData(4, 'foo11', 8, 3, 2, 11),
    createOldPanelData(7, 'foo12', 8, 3, 2, 12),
    createOldPanelData(1, 'foo13', 6, 3, 2, 13),
    createOldPanelData(7, 'foo14', 6, 3, 2, 14),
    createOldPanelData(5, 'foo15', 3, 6, 3, 15),
    createOldPanelData(1, 'foo17', 3, 4, 3, 16),
  ];

  const newPanels = migratePanelsTo730(
    panelData,
    '8.0.0',
    true,
    {}
  ) as SavedDashboardPanel730ToLatest[];
  const foo8Panel = newPanels.find((panel) => panel.id === 'foo8');

  expect(foo8Panel).toBeDefined();
  expect((foo8Panel! as any).row).toBe(undefined);
  expect(foo8Panel!.gridData.y).toBe(28);
  expect(foo8Panel!.gridData.x).toBe(0);
});

test('6.1 migrates uiState, sort, and scales', async () => {
  const uiState = {
    'P-1': { vis: { defaultColors: { '0+-+100': 'rgb(0,104,55)' } } },
  };
  const panels: RawSavedDashboardPanel610[] = [
    {
      panelIndex: 1,
      sort: 'sort',
      version: '6.1.0',
      name: 'panel-123',
      gridData: {
        h: 3,
        x: 0,
        y: 0,
        w: 6,
        i: '123',
      },
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true, uiState);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(12);
  expect(newPanel.version).toBe('8.0.0');

  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
  expect((newPanel.embeddableConfig as any).vis.defaultColors['0+-+100']).toBe('rgb(0,104,55)');
});

// https://github.com/elastic/kibana/issues/42519
it('6.1 migrates when uiState={} and panels have sort / column override', () => {
  const uiState = {};
  const panels: RawSavedDashboardPanel610[] = [
    {
      panelIndex: 1,
      sort: 'sort',
      version: '6.1.0',
      name: 'panel-123',
      gridData: { h: 3, x: 0, y: 0, w: 6, i: '123' },
    },
    {
      panelIndex: 2,
      columns: ['hi'],
      version: '6.1.0',
      name: 'panel-123',
      gridData: { h: 3, x: 0, y: 0, w: 6, i: '123' },
    },
  ];
  expect(() => migratePanelsTo730(panels, '8.0.0', true, uiState)).not.toThrow();
});

test('6.2 migrates sort and scales', async () => {
  const panels: RawSavedDashboardPanel620[] = [
    {
      panelIndex: '1',
      gridData: {
        x: 0,
        y: 0,
        w: 6,
        h: 3,
        i: '1',
      },
      sort: 'sort',
      version: '6.2.0',
      name: 'panel-123',
      embeddableConfig: { hi: 'bye' },
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(24);
  expect(newPanel.gridData.h).toBe(12);
  expect(newPanel.version).toBe('8.0.0');

  expect((newPanel as any).sort).toBeUndefined();

  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
  expect((newPanel.embeddableConfig as any).hi).toBe('bye');
});

test('6.3 migrates sort, does not scale', async () => {
  const panels: RawSavedDashboardPanel630[] = [
    {
      name: 'panel-1',
      panelIndex: '1',
      gridData: {
        x: 0,
        y: 0,
        w: 6,
        h: 3,
        i: '1',
      },
      sort: 'sort',
      columns: ['hi'],
      version: '6.3.0',
      embeddableConfig: { hi: 'bye' },
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(6);
  expect(newPanel.gridData.h).toBe(3);
  expect(newPanel.version).toBe('8.0.0');
  expect((newPanel as any).sort).toBeUndefined();
  expect((newPanel.embeddableConfig as any).hi).toBe('bye');
  expect((newPanel.embeddableConfig as any).sort).toBe('sort');
  expect((newPanel.embeddableConfig as any).columns).toEqual(['hi']);
});

test('6.4 migration converts panel index to string', async () => {
  const panels: RawSavedDashboardPanel640To720[] = [
    {
      panelIndex: 1,
      gridData: {
        x: 0,
        y: 0,
        w: 6,
        h: 3,
        i: '1',
      },
      version: '6.4.0',
      embeddableConfig: { hi: 'bye' },
      name: 'panel-123',
    },
  ];
  const newPanels = migratePanelsTo730(panels, '8.0.0', true);

  const newPanel = newPanels[0];
  expect(newPanel.gridData.w).toBe(6);
  expect(newPanel.gridData.h).toBe(3);
  expect(newPanel.version).toBe('8.0.0');
  expect((newPanel.embeddableConfig as any).hi).toBe('bye');
  expect(newPanel.panelIndex).toBe('1');
});
