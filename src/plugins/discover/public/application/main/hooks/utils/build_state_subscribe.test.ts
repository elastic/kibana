/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { createBrowserHistory } from 'history';
import { buildStateSubscribe } from './build_state_subscribe';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { FetchStatus } from '../../../types';
import { getDiscoverStateContainer } from '../../services/discover_state';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { dataViewComplexMock } from '../../../../__mocks__/data_view_complex';

describe('buildStateSubscribe', () => {
  const savedSearch = savedSearchMock;
  const history = createBrowserHistory();
  const stateContainer = getDiscoverStateContainer({
    savedSearch,
    services: discoverServiceMock,
    history,
  });
  stateContainer.dataState.refetch$.next = jest.fn();
  stateContainer.dataState.reset = jest.fn();
  stateContainer.actions.setDataView = jest.fn();
  stateContainer.actions.loadAndResolveDataView = jest.fn(() =>
    Promise.resolve({ fallback: false, dataView: dataViewComplexMock })
  );

  const setState = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set the data view if the index has changed, but no refetch should be triggered', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })({ index: dataViewComplexMock.id });

    expect(stateContainer.actions.setDataView).toHaveBeenCalledWith(dataViewComplexMock);
    expect(stateContainer.dataState.reset).toHaveBeenCalled();
    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should not call refetch$ if nothing changes', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })(stateContainer.appState.getState());

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should call refetch$ if the chart is hidden', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })({ hideChart: true });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should call refetch$ if the chart interval has changed', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })({ interval: 's' });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should call refetch$ if breakdownField has changed', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })({ breakdownField: '💣' });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should call refetch$ if sort has changed', async () => {
    await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    })({ sort: [['field', 'test']] });

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
    expect(setState).toHaveBeenCalled();
  });

  it('should not execute setState function if initialFetchStatus is UNINITIALIZED', async () => {
    const stateSubcribeFn = await buildStateSubscribe({
      stateContainer,
      savedSearch,
      setState,
    });
    stateContainer.dataState.initialFetchStatus = FetchStatus.UNINITIALIZED;
    await stateSubcribeFn({ index: dataViewComplexMock.id });

    expect(stateContainer.dataState.reset).toHaveBeenCalled();
    expect(setState).not.toHaveBeenCalled();
  });
});
