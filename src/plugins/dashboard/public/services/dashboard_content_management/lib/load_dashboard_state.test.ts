/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registry } from '../../plugin_services.stub';
import { pluginServices } from '../../plugin_services';
import { getSampleDashboardInput } from '../../../mocks';
import { loadDashboardState } from './load_dashboard_state';
import { dashboardContentManagementCache } from '../dashboard_content_management_service';
import { dataService } from '../../kibana_services';

pluginServices.setRegistry(registry.start({}));
const { embeddable, contentManagement, savedObjectsTagging } = pluginServices.getServices();

const allServices = {
  data: dataService,
  embeddable,
  contentManagement,
  savedObjectsTagging,
};

describe('Load dashboard state', () => {
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
    dashboardContentManagementCache.addDashboard = jest.fn();
    contentManagement.client.get = jest.fn();

    const { id } = getSampleDashboardInput();
    const result = await loadDashboardState({
      id,
      ...allServices,
    });
    expect(dashboardContentManagementCache.fetchDashboard).toBeCalled();
    expect(dashboardContentManagementCache.addDashboard).not.toBeCalled();
    expect(contentManagement.client.get).not.toBeCalled();
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
    contentManagement.client.get = jest.fn().mockImplementation(({ id }) => {
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
      ...allServices,
    });
    expect(dashboardContentManagementCache.fetchDashboard).toBeCalled();
    expect(dashboardContentManagementCache.addDashboard).not.toBeCalled();
  });
});
