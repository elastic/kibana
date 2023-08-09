/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { DataViewsContract } from '@kbn/data-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { FetchStatus } from '../../types';
import { RecordRawType } from '../services/discover_data_state_container';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../services/discover_state_provider';
import { DiscoverAppState } from '../services/discover_app_state_container';
import { DiscoverStateContainer } from '../services/discover_state';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { dataViewAdHoc } from '../../../__mocks__/data_view_complex';

function getHookProps(
  query: AggregateQuery | Query | undefined,
  dataViewsService?: DataViewsContract,
  appState?: Partial<DiscoverAppState>
) {
  const replaceUrlState = jest.fn();
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.appState.replaceUrlState = replaceUrlState;
  stateContainer.appState.update({ columns: [], ...appState });
  stateContainer.internalState.transitions.setSavedDataViews([dataViewMock as DataViewListItem]);

  const msgLoading = {
    recordRawType: RecordRawType.PLAIN,
    fetchStatus: FetchStatus.PARTIAL,
    query,
  };
  stateContainer.dataState.data$.documents$.next(msgLoading);

  return {
    dataViews: dataViewsService ?? discoverServiceMock.dataViews,
    stateContainer,
    savedSearch: savedSearchMock,
    replaceUrlState,
  };
}
const query = { sql: 'SELECT * from the-data-view-title' };
const msgComplete = {
  recordRawType: RecordRawType.PLAIN,
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

const getHookContext = (stateContainer: DiscoverStateContainer) => {
  return ({ children }: { children: JSX.Element }) => (
    <DiscoverMainProvider value={stateContainer}>{children}</DiscoverMainProvider>
  );
};
const renderHookWithContext = (
  useDataViewsService: boolean = false,
  appState?: DiscoverAppState
) => {
  const props = getHookProps(query, useDataViewsService ? getDataViewsService() : undefined);
  props.stateContainer.actions.setDataView(dataViewMock);
  if (appState) {
    props.stateContainer.appState.getState = jest.fn(() => {
      return appState;
    });
  }

  renderHook(() => useTextBasedQueryLanguage(props), {
    wrapper: getHookContext(props.stateContainer),
  });
  return props;
};

describe('useTextBasedQueryLanguage', () => {
  test('a text based query should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(true);

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({ index: 'the-data-view-id' });

    replaceUrlState.mockReset();

    stateContainer.dataState.data$.documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1', 'field2'],
      });
    });
  });
  test('should change viewMode to DOCUMENT_LEVEL if it was AGGREGATED_LEVEL', async () => {
    const { replaceUrlState } = renderHookWithContext(false, {
      viewMode: VIEW_MODE.AGGREGATED_LEVEL,
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      index: 'the-data-view-id',
      viewMode: VIEW_MODE.DOCUMENT_LEVEL,
    });
  });
  test('changing a text based query with different result columns should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;
    stateContainer.dataState.data$.documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });
  test('only changing a text based query with same result columns should not change columns', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);

    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title WHERE field1=1' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
  });
  test('if its not a text based query coming along, it should be ignored', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.DOCUMENT,
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
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title WHERE field1=1' },
    });

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {
      columns: ['field1'],
      index: 'the-data-view-id',
    });
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title WHERE field1=1' },
    });

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    expect(replaceUrlState).toHaveBeenCalledWith({
      columns: ['field1'],
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {
      columns: [],
      index: 'the-data-view-id',
    });
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.LOADING,
      query: { sql: 'SELECT * from the-data-view-title WHERE field1=2' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT * from the-data-view-title WHERE field1=2' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    stateContainer.appState.getState = jest.fn(() => {
      return { columns: ['field1', 'field2'], index: 'the-data-view-id' };
    });
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.LOADING,
      query: { sql: 'SELECT field1; from the-data-view-title WHERE field1=2' },
    });

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.ERROR,
    });

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.LOADING,
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      columns: ['field1'],
    });
  });

  test('changing a text based query with an index pattern that not corresponds to a dataview should return results', async () => {
    const props = getHookProps(query, discoverServiceMock.dataViews);
    const { stateContainer, replaceUrlState } = props;
    const documents$ = stateContainer.dataState.data$.documents$;
    props.stateContainer.actions.setDataView(dataViewMock);

    renderHook(() => useTextBasedQueryLanguage(props), { wrapper: getHookContext(stateContainer) });

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(2));
    replaceUrlState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-*' },
    });
    props.stateContainer.actions.setDataView(dataViewAdHoc);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });
});
