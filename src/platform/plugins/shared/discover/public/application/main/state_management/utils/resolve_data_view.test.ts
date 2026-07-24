/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { ALL_LOGS_DATA_VIEW_ID, getAllLogsDataViewSpec } from '@kbn/discover-utils/src';
import {
  buildDataViewMock,
  dataViewMock,
  deepMockedFields,
} from '@kbn/discover-utils/src/__mocks__';
import { loadAndResolveDataView, loadDataView } from './resolve_data_view';
import { createRuntimeStateManager } from '../redux';
import { discoverServiceMock as services } from '../../../../__mocks__/services';

describe('Resolve data view tests', () => {
  test('returns valid data for an existing data view', async () => {
    const dataViewId = 'the-data-view-id';
    const result = await loadDataView({
      dataViewId,
      services,
      savedDataViews: [],
      adHocDataViews: [],
    });
    expect(result.loadedDataView).toEqual(dataViewMock);
    expect(result.requestedDataViewId).toEqual(dataViewId);
    expect(result.requestedDataViewFound).toEqual(true);
  });
  test('returns fallback data for an invalid data view', async () => {
    const dataViewId = 'invalid-id';
    const result = await loadDataView({
      dataViewId,
      services,
      savedDataViews: [],
      adHocDataViews: [],
    });
    expect(result.loadedDataView).toEqual(dataViewMock);
    expect(result.requestedDataViewFound).toBe(false);
    expect(result.requestedDataViewId).toBe(dataViewId);
  });
});

describe('loadAndResolveDataView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reuses a profile-managed ad hoc data view instead of recreating it when the location spec collides', async () => {
    const managedDataView = {
      ...buildDataViewMock({
        id: ALL_LOGS_DATA_VIEW_ID,
        name: 'All logs',
        fields: deepMockedFields,
        isPersisted: false,
      }),
      managed: true,
    } as DataView;

    const runtimeStateManager = createRuntimeStateManager();
    runtimeStateManager.adHocDataViews$.next([managedDataView]);

    const result = await loadAndResolveDataView({
      locationDataViewSpec: getAllLogsDataViewSpec({ allLogsIndexPattern: 'logs-*' }),
      savedDataViews: [],
      runtimeStateManager,
      services,
    });

    expect(result.dataView).toBe(managedDataView);
    expect(result.fallback).toBe(false);
    expect(services.dataViews.clearInstanceCache).not.toHaveBeenCalled();
    expect(services.dataViews.create).not.toHaveBeenCalled();
  });
});
