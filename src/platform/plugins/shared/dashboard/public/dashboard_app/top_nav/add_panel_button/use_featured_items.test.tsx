/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { DashboardApi } from '../../../dashboard_api/types';
import { useFeaturedItems } from './use_featured_items';

const mockGetTriggerCompatibleActions = jest.fn();

jest.mock('../../../services/kibana_services', () => {
  const actual = jest.requireActual('../../../services/kibana_services');
  return {
    ...actual,
    uiActionsService: {
      getTriggerCompatibleActions: jest
        .fn()
        .mockImplementation(() => mockGetTriggerCompatibleActions()),
    },
  };
});

describe('useFeaturedItems', () => {
  const featuredAction = {
    id: 'addLensPanelAction',
    order: 50,
    getDisplayName: () => 'Create visualization',
    getIconType: () => 'lensApp',
    getDisplayNameTooltip: () => 'Build with the point-and-click editor',
    execute: jest.fn(),
  };

  const esqlAction = {
    id: 'ACTION_CREATE_ESQL_CHART',
    order: 40,
    getDisplayName: () => 'Create visualization (query)',
    getIconType: () => 'code',
    getDisplayNameTooltip: () => 'Build with the ES|QL editor',
    execute: jest.fn(),
  };

  const dashboardApi = {
    clearOverlays: jest.fn(),
  } as unknown as DashboardApi;

  beforeEach(() => {
    mockGetTriggerCompatibleActions.mockReset().mockResolvedValue([featuredAction, esqlAction]);
    (dashboardApi.clearOverlays as jest.Mock).mockClear();
  });

  it('returns compatible featured trigger actions', async () => {
    const { result } = renderHook(() => useFeaturedItems({ dashboardApi }));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.featuredItems.map((item) => item.id)).toEqual([
      'addLensPanelAction',
      'ACTION_CREATE_ESQL_CHART',
    ]);
    expect(result.current.featuredItems.find((item) => item.id === 'addLensPanelAction')).toEqual(
      expect.objectContaining({
        name: 'Create visualization',
        description: 'Build with the point-and-click editor',
      })
    );
    expect(
      result.current.featuredItems.find((item) => item.id === 'ACTION_CREATE_ESQL_CHART')
    ).toEqual(
      expect.objectContaining({
        name: 'Create visualization (query)',
        description: 'Build with the ES|QL editor',
      })
    );
  });
});
