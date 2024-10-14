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
import { PureTransitionsToTransitions } from '@kbn/kibana-utils-plugin/common/state_containers';
import { InternalStateTransitions } from '../discover_internal_state_container';
import { createDataViewDataSource } from '../../../../../common/data_sources';

const setupTestParams = (dataView: DataView | undefined) => {
  const savedSearch = savedSearchMock;
  const services = discoverServiceMock;

  const discoverState = getDiscoverStateMock({
    savedSearch,
  });
  discoverState.internalState.transitions.setDataView(savedSearch.searchSource.getField('index')!);
  services.dataViews.get = jest.fn(() => Promise.resolve(dataView as DataView));
  discoverState.appState.update = jest.fn();
  discoverState.internalState.transitions = {
    setIsDataViewLoading: jest.fn(),
    setResetDefaultProfileState: jest.fn(),
  } as unknown as Readonly<PureTransitionsToTransitions<InternalStateTransitions>>;
  return {
    services,
    appState: discoverState.appState,
    internalState: discoverState.internalState,
  };
};

describe('changeDataView', () => {
  it('should set the right app state when a valid data view (which includes the preconfigured default column) to switch to is given', async () => {
    const params = setupTestParams(dataViewWithDefaultColumnMock);
    await changeDataView(dataViewWithDefaultColumnMock.id!, params);
    expect(params.appState.update).toHaveBeenCalledWith({
      columns: ['default_column'], // default_column would be added as dataViewWithDefaultColumn has it as a mapped field
      dataSource: createDataViewDataSource({ dataViewId: 'data-view-with-user-default-column-id' }),
      sort: [['@timestamp', 'desc']],
    });
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(1, true);
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('should set the right app state when a valid data view to switch to is given', async () => {
    const params = setupTestParams(dataViewComplexMock);
    await changeDataView(dataViewComplexMock.id!, params);
    expect(params.appState.update).toHaveBeenCalledWith({
      columns: [], // default_column would not be added as dataViewComplexMock does not have it as a mapped field
      dataSource: createDataViewDataSource({ dataViewId: 'data-view-with-various-field-types-id' }),
      sort: [['data', 'desc']],
    });
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(1, true);
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('should not set the app state when an invalid data view to switch to is given', async () => {
    const params = setupTestParams(undefined);
    await changeDataView('data-view-with-various-field-types', params);
    expect(params.appState.update).not.toHaveBeenCalled();
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(1, true);
    expect(params.internalState.transitions.setIsDataViewLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('should call setResetDefaultProfileState correctly when switching data view', async () => {
    const params = setupTestParams(dataViewComplexMock);
    expect(params.internalState.transitions.setResetDefaultProfileState).not.toHaveBeenCalled();
    await changeDataView(dataViewComplexMock.id!, params);
    expect(params.internalState.transitions.setResetDefaultProfileState).toHaveBeenCalledWith({
      columns: true,
      rowHeight: true,
    });
  });
});
