/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { getAddPanelActionMenuItemsGroup } from './add_panel_action_menu_items';

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
    const grouped = getAddPanelActionMenuItemsGroup(
      getMockPresentationContainer(),
      registeredActions,
      jest.fn()
    );

    expect(grouped).toStrictEqual({
      groupedAddPanelAction: {
        id: 'groupedAddPanelAction',
        title: 'Custom group',
        order: 0,
        'data-test-subj': 'dashboardEditorMenu-groupedAddPanelActionGroup',
        items: [
          {
            'data-test-subj': 'create-action-Action name 01',
            icon: 'pencil',
            id: 'TEST_ACTION_01',
            name: 'Action name 01',
            onClick: expect.any(Function),
            description: 'Action tooltip',
            order: 0,
          },
          {
            'data-test-subj': 'create-action-Action name',
            icon: 'empty',
            id: 'TEST_ACTION_02',
            name: 'Action name',
            onClick: expect.any(Function),
            description: 'Action tooltip',
            order: 0,
          },
        ],
      },
      other: {
        id: 'other',
        title: 'Other',
        order: -1,
        'data-test-subj': 'dashboardEditorMenu-otherGroup',
        items: [
          {
            id: 'ACTION_CREATE_ESQL_CHART',
            name: 'Action name',
            icon: 'pencil',
            description: 'Action tooltip',
            onClick: expect.any(Function),
            'data-test-subj': 'create-action-Action name',
            order: 0,
          },
        ],
      },
    });
  });

  it('returns empty array if no actions have been registered', async () => {
    const grouped = getAddPanelActionMenuItemsGroup(getMockPresentationContainer(), [], jest.fn());

    expect(grouped).toStrictEqual({});
  });
});
