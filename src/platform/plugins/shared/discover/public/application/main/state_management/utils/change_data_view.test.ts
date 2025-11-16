/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  dataViewComplexMock,
  dataViewWithDefaultColumnMock,
} from '../../../../__mocks__/data_view_complex';
import { changeDataView } from './change_data_view';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { discoverServiceMock } from '../../../../__mocks__/services';
import type { DataView } from '@kbn/data-views-plugin/common';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDataViewDataSource } from '../../../../../common/data_sources';
import { createRuntimeStateManager, internalStateActions } from '../redux';

const setupTestParams = (dataView: DataView | undefined) => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;
  const runtimeStateManager = createRuntimeStateManager();
  const discoverState = getDiscoverStateMock({ savedSearch, runtimeStateManager });
  discoverState.internalState.dispatch(
    discoverState.injectCurrentTab(internalStateActions.setDataView)({
      dataView: savedSearch.searchSource.getField('index')!,
    })
  );
  services.dataViews.get = jest.fn(() => Promise.resolve(dataView as DataView));
  return {
    services,
    internalState: discoverState.internalState,
    runtimeStateManager,
    injectCurrentTab: discoverState.injectCurrentTab,
    getCurrentTab: discoverState.getCurrentTab,
  };
};

describe('changeDataView', () => {
  it('should set the right app state when a valid data view (which includes the preconfigured default column) to switch to is given', async () => {
    const params = setupTestParams(dataViewWithDefaultColumnMock);
    const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
    const promise = changeDataView({ dataViewId: dataViewWithDefaultColumnMock.id!, ...params });
    expect(params.getCurrentTab().isDataViewLoading).toBe(true);
    await promise;
    expect(updateAppStateSpy).toHaveBeenCalledWith({
      tabId: params.getCurrentTab().id,
      appState: {
        columns: ['default_column'], // default_column would be added as dataViewWithDefaultColumn has it as a mapped field
        dataSource: createDataViewDataSource({
          dataViewId: 'data-view-with-user-default-column-id',
        }),
        sort: [['@timestamp', 'desc']],
      },
    });
    expect(params.getCurrentTab().isDataViewLoading).toBe(false);
  });

  it('should set the right app state when a valid data view to switch to is given', async () => {
    const params = setupTestParams(dataViewComplexMock);
    const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
    const promise = changeDataView({ dataViewId: dataViewComplexMock.id!, ...params });
    expect(params.getCurrentTab().isDataViewLoading).toBe(true);
    await promise;
    expect(updateAppStateSpy).toHaveBeenCalledWith({
      tabId: params.getCurrentTab().id,
      appState: {
        columns: [], // default_column would not be added as dataViewComplexMock does not have it as a mapped field
        dataSource: createDataViewDataSource({
          dataViewId: 'data-view-with-various-field-types-id',
        }),
        sort: [['data', 'desc']],
      },
    });
    expect(params.getCurrentTab().isDataViewLoading).toBe(false);
  });

  it('should not set the app state when an invalid data view to switch to is given', async () => {
    const params = setupTestParams(undefined);
    const updateAppStateSpy = jest.spyOn(internalStateActions, 'updateAppState').mockClear();
    const promise = changeDataView({ dataViewId: 'data-view-with-various-field-types', ...params });
    expect(params.getCurrentTab().isDataViewLoading).toBe(true);
    await promise;
    expect(updateAppStateSpy).not.toHaveBeenCalled();
    expect(params.getCurrentTab().isDataViewLoading).toBe(false);
  });

  it('should call setResetDefaultProfileState correctly when switching data view', async () => {
    const params = setupTestParams(dataViewComplexMock);
    expect(params.getCurrentTab().resetDefaultProfileState).toEqual(
      expect.objectContaining({
        columns: false,
        rowHeight: false,
        breakdownField: false,
        hideChart: false,
      })
    );
    await changeDataView({ dataViewId: dataViewComplexMock.id!, ...params });
    expect(params.getCurrentTab().resetDefaultProfileState).toEqual(
      expect.objectContaining({
        columns: true,
        rowHeight: true,
        breakdownField: true,
        hideChart: true,
      })
    );
  });
});
