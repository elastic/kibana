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
            getDisplayName: () => 'My group',
          },
        ],
        getDisplayName: () => 'mockAddPanelAction',
        getIconType: () => 'empty',
        execute: () => {},
        isCompatible: async () => true,
      },
      {
        id: 'myVis',
        type: '',
        order: 10,
        grouping: [
          {
            id: 'visualizations',
            order: 1000,
            getDisplayName: () => 'Visualizations',
          },
        ],
        getDisplayName: () => 'myVis',
        getIconType: () => 'empty',
        execute: () => {},
        isCompatible: async () => true,
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
    expect(groups.length).toBe(2);

    expect(groups[0].title).toBe('Visualizations');
    expect(groups[0].items.length).toBe(1);
    expect(groups[1].title).toBe('My group');
    expect(groups[1].items.length).toBe(1);
  });
});
