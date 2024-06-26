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
import { useEsqlMode } from './use_esql_mode';
import { FetchStatus } from '../../types';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Query } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';
import { DiscoverMainProvider } from '../state_management/discover_state_provider';
import { DiscoverAppState } from '../state_management/discover_app_state_container';
import { DiscoverStateContainer } from '../state_management/discover_state';
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

  renderHook(() => useEsqlMode(props), {
    wrapper: getHookContext(props.stateContainer),
  });
  return props;
};

describe('useEsqlMode', () => {
  test('an ES|QL query should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(true);

    replaceUrlState.mockReset();

    stateContainer.dataState.data$.documents$.next(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });
  test('should not change viewMode to undefined (default) if it was AGGREGATED_LEVEL', async () => {
    const { replaceUrlState } = renderHookWithContext(false, {
      viewMode: VIEW_MODE.AGGREGATED_LEVEL,
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
  });

  test('should change viewMode to undefined (default) if it was PATTERN_LEVEL', async () => {
    const { replaceUrlState } = renderHookWithContext(false, {
      viewMode: VIEW_MODE.PATTERN_LEVEL,
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      viewMode: undefined,
    });
  });

  test('changing an ES|QL query with different result columns should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;
    stateContainer.dataState.data$.documents$.next(msgComplete);
    replaceUrlState.mockReset();

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
        columns: ['field1'],
      });
    });
  });

  test('changing an ES|QL query with same result columns but a different index pattern should change state when loading and finished', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;
    stateContainer.dataState.data$.documents$.next(msgComplete);
    replaceUrlState.mockReset();

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
        columns: [],
      });
    });
  });

  test('changing a ES|QL query with no transformational commands should not change state when loading and finished if index pattern is the same', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;
    stateContainer.dataState.data$.documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockReset();

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
    replaceUrlState.mockReset();

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
        columns: [],
      });
    });
  });

  test('only changing an ES|QL query with same result columns should not change columns', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);

    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockReset();

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
        columns: ['field1'],
      });
    });
    replaceUrlState.mockReset();

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
    const { replaceUrlState, stateContainer } = renderHookWithContext(false);
    const documents$ = stateContainer.dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockReset();

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
        columns: ['field1'],
      });
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {
      columns: ['field1'],
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
        columns: ['field1', 'field2'],
      });
    });
    replaceUrlState.mockReset();

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
      columns: ['field1'],
    });
  });

  test('it should not overwrite existing state columns on initial fetch and non transformational commands', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {
      columns: ['field1'],
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
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {});

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
      columns: ['field1'],
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const { replaceUrlState, stateContainer } = renderHookWithContext(false, {
      columns: [],
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
    stateContainer.appState.getState = jest.fn(() => {
      return { columns: ['field1', 'field2'], index: 'the-data-view-id' };
    });
    replaceUrlState.mockReset();

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
      columns: ['field1'],
    });
  });

  test('changing an ES|QL query with an index pattern that not corresponds to a dataview should return results', async () => {
    const props = getHookProps(query, discoverServiceMock.dataViews);
    const { stateContainer, replaceUrlState } = props;
    const documents$ = stateContainer.dataState.data$.documents$;
    props.stateContainer.actions.setDataView(dataViewMock);

    renderHook(() => useEsqlMode(props), { wrapper: getHookContext(stateContainer) });

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockReset();

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
    props.stateContainer.actions.setDataView(dataViewAdHoc);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        columns: ['field1'],
      });
    });
  });
});
