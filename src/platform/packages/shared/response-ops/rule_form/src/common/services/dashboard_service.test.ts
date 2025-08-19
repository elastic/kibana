/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dashboardServiceProvider } from './dashboard_service';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';

describe('DashboardService', () => {
  const contentManagement = contentManagementMock.createStartContract();
  const dashboardService = dashboardServiceProvider(contentManagement);

  test('should fetch dashboards', async () => {
    // arrange
    const searchMock = jest.spyOn(contentManagement.client, 'search').mockResolvedValue({
      total: 0,
      hits: [],
    });

    const resp = await dashboardService.fetchDashboards({ text: 'test*' });

    expect(searchMock).toHaveBeenCalledWith({
      contentTypeId: 'dashboard',
      query: {
        text: 'test*',
      },
      options: {
        fields: ['title', 'description'],
        includeReferences: ['tag'],
      },
    });
    expect(resp).toEqual([]);

    searchMock.mockRestore();
  });

  test('should fetch dashboard by id', async () => {
    // mock get to resolve with a dashboard
    const getMock = jest.spyOn(contentManagement.client, 'get').mockResolvedValue({
      item: {
        error: null,
        attributes: {
          title: 'Dashboard 1',
        },
        references: [],
      },
    });

    // act
    const resp = await dashboardService.fetchDashboard('1');

    // assert
    expect(getMock).toHaveBeenCalledWith({ contentTypeId: 'dashboard', id: '1' });
    expect(resp).toEqual({
      status: 'success',
      id: '1',
      attributes: {
        title: 'Dashboard 1',
      },
      references: [],
    });

    getMock.mockRestore();
  });

  test('should return an error if dashboard id is not found', async () => {
    const getMock = jest.spyOn(contentManagement.client, 'get').mockRejectedValue({
      message: 'Dashboard not found',
    });

    const resp = await dashboardService.fetchDashboard('2');
    expect(getMock).toHaveBeenCalledWith({ contentTypeId: 'dashboard', id: '2' });
    expect(resp).toEqual({
      status: 'error',
      id: '2',
      error: 'Dashboard not found',
    });
  });
});
