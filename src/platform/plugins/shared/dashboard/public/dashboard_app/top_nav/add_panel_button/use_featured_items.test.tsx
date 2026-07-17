/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { OPEN_DASHBOARD_CHAT_ACTION_ID } from '../../../dashboard_renderer/viewport/empty_screen/dashboard_empty_screen_chat_action';
import type { DashboardApi } from '../../../dashboard_api/types';
import { useFeaturedItems } from './use_featured_items';

const mockGetTriggerCompatibleActions = jest.fn();
const mockHasAction = jest.fn();
const mockGetAction = jest.fn();

jest.mock('../../../services/kibana_services', () => {
  const actual = jest.requireActual('../../../services/kibana_services');
  return {
    ...actual,
    uiActionsService: {
      getTriggerCompatibleActions: jest
        .fn()
        .mockImplementation(() => mockGetTriggerCompatibleActions()),
      hasAction: jest.fn().mockImplementation((id: string) => mockHasAction(id)),
      getAction: jest.fn().mockImplementation((id: string) => mockGetAction(id)),
    },
  };
});

describe('useFeaturedItems', () => {
  const featuredAction = {
    id: 'addLensPanelAction',
    order: 50,
    getDisplayName: () => 'Create visualization',
    getIconType: () => 'lensApp',
    getDisplayNameTooltip: () => 'Create a visualization',
    execute: jest.fn(),
  };

  const chatAction = {
    id: OPEN_DASHBOARD_CHAT_ACTION_ID,
    order: 100,
    extension: { isHighlighted: true },
    getDisplayName: () => 'Create with Chat',
    getIconType: () => 'productAgent',
    getDisplayNameTooltip: () => 'Let the agent build any panel for you.',
    isCompatible: jest.fn().mockResolvedValue(true),
    execute: jest.fn(),
  };

  const dashboardApi = {
    clearOverlays: jest.fn(),
  } as unknown as DashboardApi;

  beforeEach(() => {
    mockGetTriggerCompatibleActions.mockReset().mockResolvedValue([featuredAction]);
    mockHasAction.mockReset().mockReturnValue(false);
    mockGetAction.mockReset();
  });

  it('returns featured trigger actions without Chat by default', async () => {
    const { result } = renderHook(() => useFeaturedItems({ dashboardApi }));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featuredItems.map((item) => item.id)).toEqual(['addLensPanelAction']);
    expect(mockGetAction).not.toHaveBeenCalled();
  });

  it('prepends the open-dashboard-chat action when requested and available', async () => {
    mockHasAction.mockReturnValue(true);
    mockGetAction.mockResolvedValue(chatAction);

    const { result } = renderHook(() =>
      useFeaturedItems({ dashboardApi, includeOpenDashboardChat: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featuredItems.map((item) => item.id)).toEqual([
      OPEN_DASHBOARD_CHAT_ACTION_ID,
      'addLensPanelAction',
    ]);
    expect(result.current.featuredItems[0].isHighlighted).toBe(true);
    expect(result.current.featuredItems[0]['data-test-subj']).toBe(
      'create-action-Create with Chat'
    );
  });

  it('omits Chat when the action is incompatible', async () => {
    mockHasAction.mockReturnValue(true);
    mockGetAction.mockResolvedValue({
      ...chatAction,
      isCompatible: jest.fn().mockResolvedValue(false),
    });

    const { result } = renderHook(() =>
      useFeaturedItems({ dashboardApi, includeOpenDashboardChat: true })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featuredItems.map((item) => item.id)).toEqual(['addLensPanelAction']);
  });
});
