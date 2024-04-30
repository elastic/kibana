/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { getAddPanelActionMenuItems } from './add_panel_action_menu_items';

describe('getAddPanelActionMenuItems', () => {
  it('returns the items correctly', async () => {
    const registeredActions = [
      {
        id: 'ACTION_CREATE_ESQL_CHART',
        type: 'ACTION_CREATE_ESQL_CHART',
        getDisplayName: () => 'Action name',
        getIconType: () => 'pencil',
        getDisplayNameTooltip: () => 'Action tooltip',
        isCompatible: () => Promise.resolve(true),
        execute: jest.fn(),
      },
      {
        id: 'TEST_ACTION_01',
        type: 'TEST_ACTION_01',
        getDisplayName: () => 'Action name 01',
        getIconType: () => 'pencil',
        getDisplayNameTooltip: () => 'Action tooltip',
        isCompatible: () => Promise.resolve(true),
        execute: jest.fn(),
        grouping: [
          {
            id: 'groupedAddPanelAction',
            getDisplayName: () => 'Custom group',
            getIconType: () => 'logoElasticsearch',
          },
        ],
      },
      {
        id: 'TEST_ACTION_02',
        type: 'TEST_ACTION_02',
        getDisplayName: () => 'Action name',
        getDisplayNameTooltip: () => 'Action tooltip',
        getIconType: () => undefined,
        isCompatible: () => Promise.resolve(true),
        execute: jest.fn(),
        grouping: [
          {
            id: 'groupedAddPanelAction',
            getDisplayName: () => 'Custom group',
            getIconType: () => 'logoElasticsearch',
          },
        ],
      },
    ];
    const [items, grouped] = getAddPanelActionMenuItems(
      getMockPresentationContainer(),
      registeredActions,
      jest.fn()
    );
    expect(items).toStrictEqual([
      {
        'data-test-subj': 'create-action-Action name',
        icon: 'pencil',
        name: 'Action name',
        onClick: expect.any(Function),
        toolTipContent: 'Action tooltip',
      },
    ]);
    expect(grouped).toStrictEqual({
      groupedAddPanelAction: {
        id: 'groupedAddPanelAction',
        title: 'Custom group',
        icon: 'logoElasticsearch',
        items: [
          {
            'data-test-subj': 'create-action-Action name 01',
            icon: 'pencil',
            name: 'Action name 01',
            onClick: expect.any(Function),
            toolTipContent: 'Action tooltip',
          },
          {
            'data-test-subj': 'create-action-Action name',
            icon: 'empty',
            name: 'Action name',
            onClick: expect.any(Function),
            toolTipContent: 'Action tooltip',
          },
        ],
      },
    });
  });

  it('returns empty array if no actions have been registered', async () => {
    const [items, grouped] = getAddPanelActionMenuItems(
      getMockPresentationContainer(),
      [],
      jest.fn()
    );
    expect(items).toStrictEqual([]);
    expect(grouped).toStrictEqual({});
  });
});
