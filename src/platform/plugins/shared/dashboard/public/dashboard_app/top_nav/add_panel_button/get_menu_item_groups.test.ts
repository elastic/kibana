/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ACTION_CREATE_TIME_SLIDER } from '@kbn/controls-constants';
import { buildMockDashboardApi } from '../../../mocks';
import { getMenuItemGroups } from './get_menu_item_groups';

const mockGetTriggerCompatibleActions = jest.fn();
const mockGetAction = jest.fn();
jest.mock('../../../services/kibana_services', () => {
  const actual = jest.requireActual('../../../services/kibana_services');
  return {
    ...actual,
    uiActionsService: {
      getTriggerCompatibleActions: jest
        .fn()
        .mockImplementation(() => mockGetTriggerCompatibleActions()),
      getAction: jest.fn().mockImplementation((id: string) => mockGetAction(id)),
    },
  };
});

describe('getMenuItemGroups', () => {
  test('gets sorted groups from visTypes, visTypeAliases, and add panel actions', async () => {
    mockGetTriggerCompatibleActions.mockResolvedValueOnce([
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
    ]);

    const api = {
      ...buildMockDashboardApi().api,
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
    expect(mockGetAction).not.toBeCalled();
  });

  test('do not fetch time slider action if control group does not exist', async () => {
    mockGetTriggerCompatibleActions.mockResolvedValueOnce([
      {
        id: 'mockAddPanelAction',
        type: '',
        order: 1,
        grouping: [
          {
            id: 'myGroup',
            order: 950,
            getDisplayName: () => 'My group',
          },
        ],
        getDisplayName: () => 'mockAddPanelAction',
        getIconType: () => 'empty',
        execute: () => {},
        isCompatible: async () => true,
      },
    ]);

    const api = {
      ...buildMockDashboardApi().api,
      getAppContext: () => ({
        currentAppId: 'dashboards',
      }),
      openOverlay: () => {},
      clearOverlays: () => {},
    };
    const groups = await getMenuItemGroups(api);
    expect(groups.length).toBe(1);
    expect(mockGetAction).not.toBeCalled();
  });

  test('fetch time slider action if control group exists', async () => {
    mockGetTriggerCompatibleActions.mockResolvedValueOnce([
      {
        id: 'createSomeControl',
        type: '',
        order: 1,
        grouping: [
          {
            id: 'controls',
            order: 900,
            getDisplayName: (): string => 'Controls',
          },
        ],
        getDisplayName: (): string => 'A control',
        getIconType: (): string => 'controls',
        execute: () => {},
        isCompatible: async (): Promise<boolean> => true,
      },
    ]);
    mockGetAction.mockResolvedValueOnce({
      getDisplayName: () => 'Time slider',
      isCompatible: async (): Promise<boolean> => true,
    });

    const api = {
      ...buildMockDashboardApi().api,
      getAppContext: () => ({
        currentAppId: 'dashboards',
      }),
      openOverlay: () => {},
      clearOverlays: () => {},
    };
    const groups = await getMenuItemGroups(api);
    expect(groups.length).toBe(1);
    expect(mockGetAction).toBeCalledWith(ACTION_CREATE_TIME_SLIDER);
    expect(groups[0].title).toBe('Controls');
    expect(groups[0].items.length).toBe(2);
    expect(groups[0].items[1].isDisabled).toBe(false);
  });

  test('disable time slider action if it is incompatible', async () => {
    mockGetTriggerCompatibleActions.mockResolvedValueOnce([
      {
        id: 'createSomeControl',
        type: '',
        order: 1,
        grouping: [
          {
            id: 'controls',
            order: 900,
            getDisplayName: (): string => 'Controls',
          },
        ],
        getDisplayName: (): string => 'A control',
        getIconType: (): string => 'controls',
        execute: () => {},
        isCompatible: async (): Promise<boolean> => true,
      },
    ]);

    mockGetAction.mockResolvedValueOnce({
      getDisplayName: () => 'Time slider',
      isCompatible: async (): Promise<boolean> => false,
    });

    const api = {
      ...buildMockDashboardApi().api,
      getAppContext: () => ({
        currentAppId: 'dashboards',
      }),
      openOverlay: () => {},
      clearOverlays: () => {},
    };
    const groups = await getMenuItemGroups(api);
    expect(groups.length).toBe(1);
    expect(groups[0].items.length).toBe(2);
    expect(groups[0].items[1].isDisabled).toBe(true);
  });
});
