/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { DashboardContentManagementService, LoadDashboardReturn } from './types';
import { DashboardAttributes } from '../../../common/content_management';
import { SearchDashboardsResponse } from './lib/find_dashboards';

export type DashboardContentManagementServiceFactory =
  PluginServiceFactory<DashboardContentManagementService>;

export const dashboardContentManagementServiceFactory: DashboardContentManagementServiceFactory =
  () => {
    return {
      loadDashboardState: jest.fn().mockImplementation(() =>
        Promise.resolve({
          dashboardInput: {},
        } as LoadDashboardReturn)
      ),
      saveDashboardState: jest.fn(),
      findDashboards: {
        search: jest.fn().mockImplementation(({ search, size }) => {
          const sizeToUse = size ?? 10;
          const hits: SearchDashboardsResponse['hits'] = [];
          for (let i = 0; i < sizeToUse; i++) {
            hits.push({
              type: 'dashboard',
              id: `dashboard${i}`,
              attributes: {
                description: `dashboard${i} desc`,
                title: `dashboard${i} - ${search} - title`,
              },
              references: [] as SearchDashboardsResponse['hits'][0]['references'],
            } as SearchDashboardsResponse['hits'][0]);
          }
          return Promise.resolve({
            total: sizeToUse,
            hits,
          });
        }),
        findById: jest.fn(),
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
      deleteDashboards: jest.fn(),
      checkForDuplicateDashboardTitle: jest.fn(),
      updateDashboardMeta: jest.fn(),
    };
  };
