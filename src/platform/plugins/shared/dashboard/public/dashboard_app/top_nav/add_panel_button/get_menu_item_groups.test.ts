/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMenuItemGroups } from './get_menu_item_groups';

jest.mock('../../../services/kibana_services', () => ({
  uiActionsService: {
    getTriggerCompatibleActions: async () => [
      {
        id: 'mockAddPanelAction',
        type: '',
        order: 10,
        grouping: [
          {
            id: 'myGroup',
            order: 900,
            getDisplayName: (): string => 'My group',
          },
        ],
        getDisplayName: (): string => 'mockAddPanelAction',
        getIconType: (): string => 'empty',
        execute: () => {},
        isCompatible: async (): Promise<boolean> => true,
      },
      {
        id: 'myVis',
        type: '',
        order: 10,
        grouping: [
          {
            id: 'visualizations',
            order: 1000,
            getDisplayName: (): string => 'Other visualizations',
          },
        ],
        getDisplayName: (): string => 'myVis',
        getIconType: (): string => 'empty',
        execute: () => {},
        isCompatible: async (): Promise<boolean> => true,
      },
      {
        id: 'createTimeSlider',
        type: '',
        order: 0,
        grouping: [
          {
            id: 'controls',
            order: 950,
            getDisplayName: (): string => 'Controls',
          },
        ],
        getDisplayName: (): string => 'Time slider',
        getIconType: (): string => 'controls',
        getDisplayNameTooltip: (): string => 'Only one time slider',
        execute: () => {},
        isCompatible: async (): Promise<boolean> => true,
      },
    ],
  },
}));

describe('getMenuItemGroups', () => {
  test('gets sorted groups from visTypes, visTypeAliases, and add panel actions', async () => {
    const api = {
      getAppContext: () => ({
        currentAppId: 'dashboards',
      }),
      openOverlay: () => {},
      clearOverlays: () => {},
    };
    const groups = await getMenuItemGroups(api);
    expect(groups.length).toBe(3);

    expect(groups[0].title).toBe('Other visualizations');
    expect(groups[0].items.length).toBe(1);
    expect(groups[1].title).toBe('Controls');
    expect(groups[1].items.length).toBe(1);
    expect(groups[1].items[0].id).toBe('createTimeSlider');
    expect(groups[1].items[0].isDisabled).toBeFalsy();
    expect(groups[2].title).toBe('My group');
    expect(groups[2].items.length).toBe(1);
  });

  test('disables time slider menu item when a time slider is already pinned', async () => {
    const api = {
      getAppContext: () => ({
        currentAppId: 'dashboards',
      }),
      openOverlay: () => {},
      clearOverlays: () => {},
      layout$: {
        getValue: () => ({
          pinnedPanels: {
            ts1: { type: 'time_slider_control' },
          },
          panels: {},
          sections: {},
        }),
      },
    };
    const groups = await getMenuItemGroups(api);
    const controlsGroup = groups.find((g) => g.id === 'controls');
    expect(controlsGroup?.items[0].isDisabled).toBe(true);
    expect(controlsGroup?.items[0].description).toBe('Only one time slider');
  });
});
