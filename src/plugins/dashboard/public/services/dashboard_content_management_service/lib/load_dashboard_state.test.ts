/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDashboardContentManagementCache } from '..';
import { getSampleDashboardInput } from '../../../mocks';
import { contentManagementService } from '../../kibana_services';
import { loadDashboardState } from './load_dashboard_state';

describe('Load dashboard state', () => {
  const dashboardContentManagementCache = getDashboardContentManagementCache();

  it('should return cached result if available', async () => {
    dashboardContentManagementCache.fetchDashboard = jest.fn().mockImplementation((id: string) => {
      return {
        item: {
          id,
          version: 1,
          references: [],
          type: 'dashboard',
          attributes: {
            kibanaSavedObjectMeta: { searchSourceJSON: '' },
            title: 'Test dashboard',
          },
        },
        meta: {},
      };
    });
    contentManagementService.client.get = jest.fn();
    dashboardContentManagementCache.addDashboard = jest.fn();

    const { id } = getSampleDashboardInput();
    const result = await loadDashboardState({
      id,
    });
    expect(dashboardContentManagementCache.fetchDashboard).toBeCalled();
    expect(dashboardContentManagementCache.addDashboard).not.toBeCalled();
    expect(contentManagementService.client.get).not.toBeCalled();
    expect(result).toMatchObject({
      dashboardId: id,
      dashboardFound: true,
      dashboardInput: {
        title: 'Test dashboard',
      },
    });
  });

  it('should not add to cache for alias redirect result', async () => {
    dashboardContentManagementCache.fetchDashboard = jest.fn().mockImplementation(() => undefined);
    dashboardContentManagementCache.addDashboard = jest.fn();
    contentManagementService.client.get = jest.fn().mockImplementation(({ id }) => {
      return Promise.resolve({
        item: { id },
        meta: {
          outcome: 'aliasMatch',
        },
      });
    });
    const { id } = getSampleDashboardInput();
    await loadDashboardState({
      id,
    });
    expect(dashboardContentManagementCache.fetchDashboard).toBeCalled();
    expect(dashboardContentManagementCache.addDashboard).not.toBeCalled();
  });
});
