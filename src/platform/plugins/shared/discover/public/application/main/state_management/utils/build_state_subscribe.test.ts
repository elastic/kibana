/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildStateSubscribe } from './build_state_subscribe';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { FetchStatus } from '../../../types';
import { dataViewComplexMock } from '../../../../__mocks__/data_view_complex';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { createDataViewDataSource, DataSourceType } from '../../../../../common/data_sources';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { internalStateActions } from '../redux';

describe('buildStateSubscribe', () => {
  const savedSearch = savedSearchMock;
  const stateContainer = getDiscoverStateMock({ savedSearch });
  stateContainer.dataState.refetch$.next = jest.fn();
  stateContainer.dataState.reset = jest.fn();
  stateContainer.savedSearchState.update = jest.fn();
  jest.spyOn(internalStateActions, 'assignNextDataView');

  const getSubscribeFn = () => {
    return buildStateSubscribe({
      savedSearchState: stateContainer.savedSearchState,
      dataState: stateContainer.dataState,
      internalState: stateContainer.internalState,
      runtimeStateManager: stateContainer.runtimeStateManager,
      services: discoverServiceMock,
      getCurrentTab: stateContainer.getCurrentTab,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set the data view if the index has changed, and refetch should be triggered', async () => {
    await getSubscribeFn()({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });

    expect(internalStateActions.assignNextDataView as jest.Mock).toHaveBeenCalledWith({
      tabId: 'the-saved-search-id',
      dataView: dataViewComplexMock,
    });
    expect(stateContainer.dataState.reset).toHaveBeenCalled();
    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should not call refetch$ if nothing changes', async () => {
    await getSubscribeFn()(stateContainer.getCurrentTab().appState);

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if viewMode changes', async () => {
    await getSubscribeFn()({
      ...stateContainer.getCurrentTab().appState,
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

  it('should call refetch$ if interval has changed', async () => {
    await getSubscribeFn()({ interval: 'm' });

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

    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.resetAppState)({
        appState: {
          dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
        },
      })
    );

    await getSubscribeFn()({
      dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
    });
    expect(stateContainer.dataState.reset).toBeCalledTimes(1);
  });
});
