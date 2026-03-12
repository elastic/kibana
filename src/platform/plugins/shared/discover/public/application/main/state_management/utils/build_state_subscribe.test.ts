/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildStateSubscribe } from './build_state_subscribe';
import { FetchStatus } from '../../../types';
import { dataViewComplexMock } from '../../../../__mocks__/data_view_complex';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { createDiscoverServicesMock } from '../../../../__mocks__/services';
import { createDataViewDataSource, DataSourceType } from '../../../../../common/data_sources';
import { VIEW_MODE } from '@kbn/saved-search-plugin/common';
import { internalStateActions, type TabState } from '../redux';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';

describe('buildStateSubscribe', () => {
  let toolkit: ReturnType<typeof getDiscoverInternalStateMock>;
  let services: ReturnType<typeof createDiscoverServicesMock>;
  let stateContainer: Awaited<
    ReturnType<ReturnType<typeof getDiscoverInternalStateMock>['initializeSingleTab']>
  >['stateContainer'];

  const setup = async () => {
    services = createDiscoverServicesMock();
    toolkit = getDiscoverInternalStateMock({
      services,
      persistedDataViews: [dataViewWithTimefieldMock, dataViewComplexMock],
    });

    await toolkit.initializeTabs();
    const result = await toolkit.initializeSingleTab({
      tabId: toolkit.getCurrentTab().id,
      skipWaitForDataFetching: true,
    });
    stateContainer = result.stateContainer;

    stateContainer.dataState.refetch$.next = jest.fn();
    stateContainer.dataState.reset = jest.fn();
    jest.spyOn(internalStateActions, 'assignNextDataView');
  };

  const getSubscribeFn = () => {
    return buildStateSubscribe({
      dataState: stateContainer.dataState,
      internalState: toolkit.internalState,
      runtimeStateManager: toolkit.runtimeStateManager,
      services,
      getCurrentTab: toolkit.getCurrentTab,
    });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await setup();
  });

  const getNextState = ({
    appState: appStateOverrides = {},
  }: {
    appState?: Partial<TabState['appState']>;
  } = {}) => ({
    ...toolkit.getCurrentTab().appState,
    ...appStateOverrides,
  });

  it('should set the data view if the index has changed, and refetch should be triggered', async () => {
    await getSubscribeFn()(
      getNextState({
        appState: {
          dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
        },
      })
    );

    expect(internalStateActions.assignNextDataView as jest.Mock).toHaveBeenCalledWith({
      tabId: toolkit.getCurrentTab().id,
      dataView: dataViewComplexMock,
    });
    expect(stateContainer.dataState.reset).toHaveBeenCalled();
    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should not call refetch$ if nothing changes', async () => {
    await getSubscribeFn()(getNextState());

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if viewMode changes', async () => {
    await getSubscribeFn()(
      getNextState({
        appState: {
          dataSource: { type: DataSourceType.Esql },
          viewMode: VIEW_MODE.AGGREGATED_LEVEL,
        },
      })
    );

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
    expect(stateContainer.dataState.reset).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if the chart is hidden', async () => {
    await getSubscribeFn()(getNextState({ appState: { hideChart: true } }));

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if the chart interval has changed', async () => {
    await getSubscribeFn()(getNextState({ appState: { interval: 's' } }));

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not call refetch$ if breakdownField has changed', async () => {
    await getSubscribeFn()(getNextState({ appState: { breakdownField: '💣' } }));

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should call refetch$ if sort has changed', async () => {
    await getSubscribeFn()(getNextState({ appState: { sort: [['field', 'test']] } }));

    expect(stateContainer.dataState.refetch$.next).toHaveBeenCalled();
  });

  it('should not call refetch$ if filters have changed', async () => {
    await getSubscribeFn()(
      getNextState({
        appState: {
          filters: [
            {
              meta: { index: 'test-index', disabled: false, negate: false, alias: null },
              query: { match: { field: 'value' } },
            },
          ],
        },
      })
    );

    expect(stateContainer.dataState.refetch$.next).not.toHaveBeenCalled();
  });

  it('should not execute setState function if initialFetchStatus is UNINITIALIZED', async () => {
    const stateSubscribeFn = getSubscribeFn();
    stateContainer.dataState.getInitialFetchStatus = jest.fn(() => FetchStatus.UNINITIALIZED);
    await stateSubscribeFn(
      getNextState({
        appState: {
          dataSource: createDataViewDataSource({ dataViewId: dataViewComplexMock.id! }),
        },
      })
    );

    expect(stateContainer.dataState.reset).toHaveBeenCalled();
  });

  it('should not execute setState twice if the identical data view change is propagated twice', async () => {
    const newDataSource = createDataViewDataSource({ dataViewId: dataViewComplexMock.id! });

    await getSubscribeFn()(getNextState({ appState: { dataSource: newDataSource } }));

    expect(stateContainer.dataState.reset).toBeCalledTimes(1);

    toolkit.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.resetAppState)({
        appState: {
          dataSource: newDataSource,
        },
      })
    );

    await getSubscribeFn()(getNextState({ appState: { dataSource: newDataSource } }));
    expect(stateContainer.dataState.reset).toBeCalledTimes(1);
  });
});
