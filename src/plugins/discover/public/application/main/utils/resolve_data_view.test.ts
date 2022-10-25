/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loadDataView, getFallbackDataViewId } from './resolve_data_view';
import { dataViewsMock } from '../../../__mocks__/data_views';
import { dataViewMock } from '../../../__mocks__/data_view';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { discoverServiceMock } from '../../../__mocks__/services';

describe('Resolve data view tests', () => {
  test('returns valid data for an existing data view', async () => {
    const dataViewId = 'the-data-view-id';
    const dataViewList = [dataViewMock as unknown as DataViewListItem];
    const result = await loadDataView(dataViewList, discoverServiceMock, dataViewId);
    expect(result.loaded).toEqual(dataViewMock);
    expect(result.stateValFound).toEqual(true);
    expect(result.stateVal).toEqual(dataViewId);
  });
  test('returns fallback data for an invalid data view', async () => {
    const dataViewId = 'invalid-id';
    const dataViewList = [dataViewMock as unknown as DataViewListItem];
    const result = await loadDataView(dataViewList, discoverServiceMock, dataViewId);
    expect(result.loaded).toEqual(dataViewMock);
    expect(result.stateValFound).toBe(false);
    expect(result.stateVal).toBe(dataViewId);
  });
  test('getFallbackDataViewId with an empty dataViews array', async () => {
    const result = await getFallbackDataViewId([], '');
    expect(result).toBe('');
  });
  test('getFallbackDataViewId with an dataViews array', async () => {
    const list = await dataViewsMock.getIdsWithTitle();
    const result = await getFallbackDataViewId(list, '');
    expect(result).toBe('the-data-view-id');
  });
});
