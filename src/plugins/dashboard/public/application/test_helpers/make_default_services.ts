/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ScopedHistory } from '@kbn/core/public';
import { savedObjectsPluginMock } from '@kbn/saved-objects-plugin/public/mocks';
import { coreMock } from '@kbn/core/public/mocks';

import { SavedObjectLoader, SavedObjectLoaderFindOptions } from '../../services/saved_objects';
import { DashboardAppServices } from '../../types';
import { getSavedDashboardMock } from './get_saved_dashboard_mock';
import { DashboardSessionStorage } from '../lib';

export function makeDefaultServices(): DashboardAppServices {
  const core = coreMock.createStart();

  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.find = (search: string, sizeOrOptions: number | SavedObjectLoaderFindOptions) => {
    const size = typeof sizeOrOptions === 'number' ? sizeOrOptions : sizeOrOptions.size ?? 10;
    const hits = [];
    for (let i = 0; i < size; i++) {
      hits.push({
        id: `dashboard${i}`,
        title: `dashboard${i} - ${search} - title`,
        description: `dashboard${i} desc`,
      });
    }
    return Promise.resolve({
      total: size,
      hits,
    });
  };
  savedDashboards.get = jest
    .fn()
    .mockImplementation((id?: string) => Promise.resolve(getSavedDashboardMock({ id })));

  const dashboardSessionStorage = {
    getDashboardIdsWithUnsavedChanges: jest
      .fn()
      .mockResolvedValue(['dashboardUnsavedOne', 'dashboardUnsavedTwo']),
    getState: jest.fn().mockReturnValue(undefined),
    setState: jest.fn(),
  } as unknown as DashboardSessionStorage;
  dashboardSessionStorage.clearState = jest.fn();

  return {
    savedObjects: savedObjectsPluginMock.createStartContract(),
    savedObjectsClient: core.savedObjects.client,
    scopedHistory: () => ({} as ScopedHistory),
    setHeaderActionMenu: (mountPoint) => {},
    restorePreviousUrl: () => {},
    onAppLeave: (handler) => {},
    dashboardSessionStorage,
    savedDashboards,
    core,
  };
}
