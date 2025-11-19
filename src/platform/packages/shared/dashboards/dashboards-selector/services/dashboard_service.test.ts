/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dashboardServiceProvider } from './dashboard_service';
import type { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

describe('DashboardService', () => {
  const mockSearchAction = {
    execute: jest.fn((context: ActionExecutionContext) => {
      if (context.onResults) {
        context.onResults([
          { id: '1', isManaged: false, title: 'Dashboard 1' },
          { id: '2', isManaged: false, title: 'Dashboard 2' },
        ]);
      }
    }),
  };

  const mockUiActions = {
    getAction: jest.fn().mockResolvedValue(mockSearchAction),
  } as unknown as UiActionsPublicStart;

  const dashboardService = dashboardServiceProvider(mockUiActions);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should fetch dashboards', async () => {
    const resp = await dashboardService.fetchDashboards({ search: 'test', limit: 100 });

    expect(mockUiActions.getAction).toHaveBeenCalledWith('searchDashboardAction');
    expect(mockSearchAction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        search: {
          search: 'test',
          per_page: 100,
        },
        trigger: { id: 'searchDashboards' },
      })
    );
    expect(resp).toEqual([
      { id: '1', attributes: { title: 'Dashboard 1' } },
      { id: '2', attributes: { title: 'Dashboard 2' } },
    ]);
  });

  test('should fetch dashboards without search term', async () => {
    const resp = await dashboardService.fetchDashboards({ limit: 50 });

    expect(mockSearchAction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        search: {
          search: undefined,
          per_page: 50,
        },
      })
    );
    expect(resp).toHaveLength(2);
  });

  test('should fetch dashboard by id', async () => {
    // First fetch all dashboards, then find by id
    const resp = await dashboardService.fetchDashboard('1');

    expect(resp).toEqual({
      id: '1',
      attributes: { title: 'Dashboard 1' },
    });
  });

  test('should return null if dashboard id is not found', async () => {
    const resp = await dashboardService.fetchDashboard('999');

    expect(resp).toBeNull();
  });

  test('should handle errors gracefully', async () => {
    const errorUiActions = {
      getAction: jest.fn().mockRejectedValue(new Error('Action not found')),
    } as unknown as UiActionsPublicStart;

    const errorService = dashboardServiceProvider(errorUiActions);
    const resp = await errorService.fetchDashboards();

    expect(resp).toEqual([]);
  });
});
