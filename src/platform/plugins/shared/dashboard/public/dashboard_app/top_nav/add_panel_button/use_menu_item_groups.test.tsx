/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import { buildMockDashboardApi } from '../../../mocks';
import { useMenuItemGroups } from './use_menu_item_groups';
import { Subject } from 'rxjs';

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

describe('useMenuItemGroups', () => {
  test('gets sorted groups + items from ADD_PANEL_TRIGGER actions', async () => {
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
    const { result } = renderHook(() => useMenuItemGroups({ dashboardApi: api }));
    await waitFor(() => {
      return !result.current.loading;
    });
    const groups = result.current.groups;
    expect(groups).toBeDefined();
    expect(groups!.length).toBe(2);
    expect(groups![0].title).toBe('Visualizations');
    expect(groups![0].items.length).toBe(1);
    expect(groups![1].title).toBe('My group');
    expect(groups![1].items.length).toBe(1);
    expect(mockGetAction).not.toBeCalled();
  });

  test('updates disabled state when `disabledStateChangesSubject` fires', async () => {
    const disabledStateSubject = new Subject<void>();
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
        isDisabled: jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false),
        getDisabledStateChangesSubject: () => disabledStateSubject,
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
    const { result, rerender } = renderHook(() => useMenuItemGroups({ dashboardApi: api }));
    await waitFor(() => {
      return !result.current.loading;
    });
    const renderedGroups = result.current.groups;
    expect(renderedGroups).toBeDefined();
    expect(renderedGroups!.length).toBe(1);
    expect(renderedGroups![0].items.length).toBe(1);
    expect(renderedGroups![0].items[0].isDisabled).toBe(true);

    act(() => disabledStateSubject.next());

    rerender(() => useMenuItemGroups({ dashboardApi: api }));
    const rerenderedGroups = result.current.groups;
    expect(rerenderedGroups).toBeDefined();
    expect(rerenderedGroups!.length).toBe(1);
    expect(rerenderedGroups![0].items.length).toBe(1);
    expect(rerenderedGroups![0].items[0].isDisabled).toBe(false);
  });
});
