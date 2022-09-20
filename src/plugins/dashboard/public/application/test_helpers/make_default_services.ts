/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SavedObjectLoader,
  type SavedObjectLoaderFindOptions,
} from '../../services/saved_object_loader';
import { DashboardAppServices } from '../../types';
import { getSavedDashboardMock } from './get_saved_dashboard_mock';

// TODO: Remove as part of https://github.com/elastic/kibana/pull/138774
export function makeDefaultServices(): DashboardAppServices {
  const savedDashboards = {} as SavedObjectLoader;
  savedDashboards.find = (search: string, sizeOrOptions: number | SavedObjectLoaderFindOptions) => {
    const size = typeof sizeOrOptions === 'number' ? sizeOrOptions : sizeOrOptions.size ?? 10;
    const hits = [];
    for (let i = 0; i < size; i++) {
      hits.push({
        id: `dashboard${i}`,
        title: `dashboard${i} - ${search} - title`,
        description: `dashboard${i} desc`,
        references: [],
        timeRestore: true,
        type: '',
        url: '',
        updatedAt: '',
        panelsJSON: '',
        lastSavedTitle: '',
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

  return {
    savedDashboards,
  };
}
