/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dashboardServiceProvider } from './dashboard_service';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';

describe('DashboardService', () => {
  // @ts-expect-error Only partial mock of full plugin
  const dashboard: DashboardStart = {
    findDashboardsService: jest.fn().mockResolvedValue({
      search: jest.fn().mockResolvedValue({
        total: 0,
        hits: [],
      }),
    }),
  };

  const dashboardService = dashboardServiceProvider(dashboard);

  test('should fetch dashboard', async () => {
    // act
    const resp = await dashboardService.fetchDashboards('test');
    // assert
    const searchDashboard = (await dashboard.findDashboardsService()).search;
    expect(searchDashboard).toHaveBeenCalledWith({
      search: 'test*',
      size: 1000,
      options: {
        fields: ['title', 'description'],
        spaces: ['*'],
      },
    });
    expect(resp).toEqual([]);
  });
});
