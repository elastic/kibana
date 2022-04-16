/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { DashboardSavedObject } from '../../saved_dashboards';

export function getSavedDashboardMock(
  config?: Partial<DashboardSavedObject>
): DashboardSavedObject {
  const searchSource = dataPluginMock.createStartContract();

  return {
    id: '123',
    title: 'my dashboard',
    panelsJSON: '[]',
    searchSource: searchSource.search.searchSource.create(),
    copyOnSave: false,
    timeRestore: false,
    timeTo: 'now',
    timeFrom: 'now-15m',
    optionsJSON: '',
    lastSavedTitle: '',
    destroy: () => {},
    save: () => {
      return Promise.resolve('123');
    },
    getQuery: () => ({ query: '', language: 'kuery' }),
    getFilters: () => [],
    ...config,
  } as DashboardSavedObject;
}
