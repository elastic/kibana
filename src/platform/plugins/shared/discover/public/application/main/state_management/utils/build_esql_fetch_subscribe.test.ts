/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataViewListItem } from '@kbn/data-views-plugin/common';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { omit } from 'lodash';
import { discoverServiceMock } from '../../../../__mocks__/services';
import { FetchStatus } from '../../../types';
import { getDiscoverStateMock } from '../../../../__mocks__/discover_state.mock';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { internalStateActions } from '../redux';
import type { DiscoverAppState } from '../redux';
import { dataViewAdHoc } from '../../../../__mocks__/data_view_complex';

async function getTestProps({
  query,
  dataViewsService = discoverServiceMock.dataViews,
  appState,
  defaultFetchStatus = FetchStatus.PARTIAL,
  resetTheHook,
}: {
  query: AggregateQuery | Query | undefined;
  dataViewsService?: DataViewsContract;
  appState?: Partial<DiscoverAppState>;
  defaultFetchStatus?: FetchStatus;
  resetTheHook?: boolean;
}) {
  const replaceUrlState = jest
    .spyOn(internalStateActions, 'updateAppStateAndReplaceUrl')
    .mockClear();
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
      appState: { columns: [], ...appState },
    })
  );
  const dataViewList = [dataViewMock as DataViewListItem];
  jest.spyOn(dataViewsService, 'getIdsWithTitle').mockResolvedValue(dataViewList);
  await stateContainer.internalState.dispatch(internalStateActions.loadDataViewList());

  const msgLoading = {
    fetchStatus: defaultFetchStatus,
    query,
  };
  stateContainer.dataState.data$.documents$.next(msgLoading);

  if (resetTheHook) {
    // resets the state of buildEsqlFetchSubscribe hook so it takes the current app state as the initial one
    stateContainer.savedSearchState.set(savedSearchMock);
  }

  return {
    dataViews: dataViewsService,
    stateContainer,
    savedSearch: savedSearchMock,
    replaceUrlState,
  };
}

const query = { esql: 'from the-data-view-title' };
const msgComplete = {
  fetchStatus: FetchStatus.PARTIAL,
  result: [
    {
      id: '1',
      raw: { field1: 1, field2: 2 },
      flattened: { field1: 1, field2: 2 },
    } as unknown as DataTableRecord,
  ],
  query,
};

const getDataViewsService = () => {
  const dataViewsCreateMock = discoverServiceMock.dataViews.create as jest.Mock;
  dataViewsCreateMock.mockImplementation(() => ({
    ...dataViewMock,
  }));
  return {
    ...discoverServiceMock.dataViews,
    create: dataViewsCreateMock,
  };
};

const setupTest = async ({
  useDataViewsService = false,
  appState,
  defaultFetchStatus,
  resetTheHook,
}: {
  useDataViewsService?: boolean;
  appState?: DiscoverAppState;
  defaultFetchStatus?: FetchStatus;
  resetTheHook?: boolean;
} = {}) => {
  const props = await getTestProps({
    query,
    dataViewsService: useDataViewsService ? getDataViewsService() : undefined,
    appState,
    defaultFetchStatus,
    resetTheHook,
  });
  const { stateContainer } = props;
  stateContainer.internalState.dispatch(
    stateContainer.injectCurrentTab(internalStateActions.assignNextDataView)({
      dataView: dataViewMock,
    })
  );
  return props;
};

// Testing buildEsqlFetchSubscribe through the state container
// since the logic is pretty intertwined with the state management
describe('buildEsqlFetchSubscribe', () => {
  test('an ES|QL query should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({ useDataViewsService: true });

    replaceUrlState.mockClear();

    stateContainer.dataState.data$.documents$.next(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('should not change viewMode to undefined (default) if it was AGGREGATED_LEVEL', async () => {
    const { replaceUrlState } = await setupTest({
      appState: {
        viewMode: VIEW_MODE.AGGREGATED_LEVEL,
      },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
  });

  test('should change viewMode to undefined (default) if it was PATTERN_LEVEL', async () => {
    const { replaceUrlState } = await setupTest({
      appState: {
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId: 'the-saved-search-id-with-timefield',
      appState: { viewMode: undefined },
    });
  });

  test('changing an ES|QL query with different result columns should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;
    documents$.next(msgComplete);
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      // transformational command
      query: { esql: 'from the-data-view-title | keep field1' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1'] },
      });
    });
  });

  test('changing an ES|QL query with same result columns but a different index pattern should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;
    documents$.next(msgComplete);
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-2' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: [] },
      });
    });
  });

  test('changing a ES|QL query with no transformational commands should not change state when loading and finished if index pattern is the same', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;
    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      // non transformational command
      query: { esql: 'from the-data-view-title | where field1 > 0' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      // non transformational command
      query: { esql: 'from the-data-view-title2 | where field1 > 0' },
    });
    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: [] },
      });
    });
  });

  test('only changing an ES|QL query with same result columns should not change columns', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field1' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1'] },
      });
    });
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
  });

  test('if its not an ES|QL query coming along, it should be ignored', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
    });

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1'] },
      });
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });
    const documents$ = stateContainer.dataState.data$.documents$;
    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1', 'field2'] },
      });
    });
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field1' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId: 'the-saved-search-id-with-timefield',
      appState: { columns: ['field1'] },
    });
  });

  test('should overwrite existing undefined columns on initial fetch if transformational query', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({
      appState: {
        columns: undefined,
      },
      resetTheHook: true,
    });
    const documents$ = stateContainer.dataState.data$.documents$;
    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field 1' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1'] },
      });
    });
  });

  test('should not overwrite existing empty columns on initial fetch even if transformational query', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({
      appState: {
        columns: [],
      },
      resetTheHook: true,
    });
    const documents$ = stateContainer.dataState.data$.documents$;
    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('it should not overwrite existing state columns on initial fetch and non transformational commands', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | WHERE field2=1' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('it should overwrite existing state columns on transitioning from a query with non transformational commands to a query with transformational', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | WHERE field2=1' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field1' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId: 'the-saved-search-id-with-timefield',
      appState: { columns: ['field1'] },
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const { replaceUrlState, stateContainer } = await setupTest({
      appState: {
        columns: [],
      },
    });
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | WHERE field1=2' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | WHERE field1=2' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { columns: ['field1', 'field2'] },
      })
    );
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | keep field 1; | WHERE field1=2' },
    });

    documents$.next({
      fetchStatus: FetchStatus.ERROR,
    });

    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId: 'the-saved-search-id-with-timefield',
      appState: { columns: ['field1'] },
    });
  });

  test('changing an ES|QL query with an index pattern that not corresponds to a dataview should return results', async () => {
    const { stateContainer, replaceUrlState } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-* | keep field1' },
    });
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.assignNextDataView)({
        dataView: dataViewAdHoc,
      })
    );
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId: 'the-saved-search-id-with-timefield',
        appState: { columns: ['field1'] },
      });
    });
  });

  it('should call setResetDefaultProfileState correctly when index pattern changes', async () => {
    const { stateContainer } = await setupTest({
      appState: { query: { esql: 'from pattern' } },
      defaultFetchStatus: FetchStatus.LOADING,
    });
    const documents$ = stateContainer.dataState.data$.documents$;
    expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
      columns: false,
      hideChart: false,
      rowHeight: false,
      breakdownField: false,
    });
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
    });
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern1' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });
    await waitFor(() =>
      expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        hideChart: true,
        rowHeight: true,
        breakdownField: true,
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.setResetDefaultProfileState)({
        resetDefaultProfileState: {
          columns: false,
          rowHeight: false,
          breakdownField: false,
          hideChart: false,
        },
      })
    );
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern1' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });
    await waitFor(() =>
      expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        rowHeight: false,
        breakdownField: false,
        hideChart: false,
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });
    stateContainer.internalState.dispatch(
      stateContainer.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern2' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern2' },
    });
    await waitFor(() =>
      expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        rowHeight: true,
        breakdownField: true,
        hideChart: true,
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern2' },
    });
  });

  it('should call setResetDefaultProfileState correctly when columns change', async () => {
    const { stateContainer } = await setupTest({});
    const documents$ = stateContainer.dataState.data$.documents$;
    const result1 = [buildDataTableRecord({ message: 'foo' } as EsHitRecord)];
    const result2 = [buildDataTableRecord({ message: 'foo', extension: 'bar' } as EsHitRecord)];
    expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
      columns: false,
      rowHeight: false,
      breakdownField: false,
      hideChart: false,
    });
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: result1,
    });
    await waitFor(() =>
      expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: false,
        rowHeight: false,
        breakdownField: false,
        hideChart: false,
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: result2,
    });
    await waitFor(() =>
      expect(omit(stateContainer.getCurrentTab().resetDefaultProfileState, 'resetId')).toEqual({
        columns: true,
        rowHeight: false,
        breakdownField: false,
        hideChart: false,
      })
    );
  });
});
