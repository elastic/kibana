/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { buildStateSubscribe } from './build_state_subscribe';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { FetchStatus } from '../../../types';
import { dataViewComplexMock } from '../../../../__mocks__/data_view_complex';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { createDataViewDataSource, DataSourceType } from '../../../../../common/data_sources';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';

describe('buildStateSubscribe', () => {
  const savedSearch = savedSearchMock;
  const stateContainer = getDiscoverStateMock({ savedSearch });
  stateContainer.dataState.refetch$.next = jest.fn();
  stateContainer.dataState.reset = jest.fn();
  stateContainer.actions.setDataView = jest.fn();
  stateContainer.savedSearchState.update = jest.fn();

  const getSubscribeFn = () => {
    return buildStateSubscribe({
      appState: stateContainer.appState,
      savedSearchState: stateContainer.savedSearchState,
      dataState: stateContainer.dataState,
      internalState: stateContainer.internalState,
      services: discoverServiceMock,
      setDataView: stateContainer.actions.setDataView,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set the data view if the index has changed, and refetch should be triggered', async () => {
    await getSubscribeFn()({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });

    expect(stateContainer.actions.setDataView).toHaveBeenCalledWith(dataViewComplexMock);
    expect(stateContainer.dataState.reset).toHaveBeenCalled();
    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should not call refetch$ if nothing changes', async () => {
    await getSubscribeFn()(stateContainer.appState.getState());

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if viewMode changes', async () => {
    await getSubscribeFn()({
      ...stateContainer.appState.getState(),
      dataSource: {
        type: DataSourceType.Esql,
      },
      viewMode: VIEW_MODE.AGGREGATED_LEVEL,
    });

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
    expect(stateContainer.dataState.reset).not.toHaveBeenCalled();
    expect(stateContainer.savedSearchState.update).toHaveBeenCalled();
  });

  it('should call refetch$ if the chart is hidden', async () => {
    await getSubscribeFn()({ hideChart: true });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should call refetch$ if the chart interval has changed', async () => {
    await getSubscribeFn()({ interval: 's' });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should call refetch$ if breakdownField has changed', async () => {
    await getSubscribeFn()({ breakdownField: '💣' });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should call refetch$ if sort has changed', async () => {
    await getSubscribeFn()({ sort: [['field', 'test']] });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should not execute setState function if initialFetchStatus is UNINITIALIZED', async () => {
    const stateSubscribeFn = getSubscribeFn();
    stateContainer.dataState.getInitialFetchStatus = jest.fn(() => FetchStatus.UNINITIALIZED);
    await stateSubscribeFn({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });

    expect(stateContainer.dataState.reset).toHaveBeenCalled();
  });
  it('should not execute setState twice if the identical data view change is propagated twice', async () => {
    await getSubscribeFn()({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });

    expect(stateContainer.dataState.reset).toBeCalledTimes(1);

    stateContainer.appState.getPrevious = jest.fn(() => ({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    }));

    await getSubscribeFn()({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });
    expect(stateContainer.dataState.reset).toBeCalledTimes(1);
  });
});
