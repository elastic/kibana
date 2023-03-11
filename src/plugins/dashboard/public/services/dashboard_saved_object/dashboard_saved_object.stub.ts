/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsServiceMock } from '@kbn/core/public/mocks';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { FindDashboardSavedObjectsResponse } from './lib/find_dashboard_saved_objects';

import { DashboardSavedObjectService } from './types';
import { DashboardAttributes } from '../../../common';
import { LoadDashboardFromSavedObjectReturn } from './lib/load_dashboard_state_from_saved_object';

type DashboardSavedObjectServiceFactory = PluginServiceFactory<DashboardSavedObjectService>;

export const dashboardSavedObjectServiceFactory: DashboardSavedObjectServiceFactory = () => {
  const { client: savedObjectsClient } = savedObjectsServiceMock.createStartContract();
  return {
    loadDashboardStateFromSavedObject: jest.fn().mockImplementation(() =>
      Promise.resolve({
        dashboardInput: {},
      } as LoadDashboardFromSavedObjectReturn)
    ),
    saveDashboardStateToSavedObject: jest.fn(),
    findDashboards: {
      findSavedObjects: jest.fn().mockImplementation(({ search, size }) => {
        const sizeToUse = size ?? 10;
        const hits: FindDashboardSavedObjectsResponse['hits'] = [];
        for (let i = 0; i < sizeToUse; i++) {
          hits.push({
            type: 'dashboard',
            id: `dashboard${i}`,
            attributes: {
              description: `dashboard${i} desc`,
              title: `dashboard${i} - ${search} - title`,
            },
          } as FindDashboardSavedObjectsResponse['hits'][0]);
        }
        return Promise.resolve({
          total: sizeToUse,
          hits,
        });
      }),
      findByIds: jest.fn().mockImplementation(() =>
        Promise.resolve([
          {
            id: `dashboardUnsavedOne`,
            status: 'success',
            attributes: {
              title: `Dashboard Unsaved One`,
            } as unknown as DashboardAttributes,
          },
          {
            id: `dashboardUnsavedTwo`,
            status: 'success',
            attributes: {
              title: `Dashboard Unsaved Two`,
            } as unknown as DashboardAttributes,
          },
          {
            id: `dashboardUnsavedThree`,
            status: 'success',
            attributes: {
              title: `Dashboard Unsaved Three`,
            } as unknown as DashboardAttributes,
          },
        ])
      ),
      findByTitle: jest.fn(),
    },
    checkForDuplicateDashboardTitle: jest.fn(),
    savedObjectsClient,
  };
};
