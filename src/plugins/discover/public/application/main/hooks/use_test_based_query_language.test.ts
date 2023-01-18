/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { DataViewsContract } from '@kbn/data-plugin/public';
import { discoverServiceMock } from '../../../__mocks__/services';
import { useTextBasedQueryLanguage } from './use_text_based_query_language';
import { BehaviorSubject } from 'rxjs';
import { FetchStatus } from '../../types';
import { DataDocuments$, RecordRawType } from './use_saved_search';
import { DataTableRecord } from '../../../types';
import { AggregateQuery, Query } from '@kbn/es-query';
import { dataViewMock } from '../../../__mocks__/data_view';
import { DataViewListItem } from '@kbn/data-views-plugin/common';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { AppState } from '../services/discover_app_state_container';
import { getDiscoverStateMock } from '../../../__mocks__/discover_state.mock';

function getHookProps(
  replaceUrlAppState: (newState: Partial<AppState>) => Promise<void>,
  query: AggregateQuery | Query | undefined,
  dataViewsService?: DataViewsContract
) {
  const stateContainer = getDiscoverStateMock({ isTimeBased: true });
  stateContainer.replaceUrlAppState = replaceUrlAppState;
  stateContainer.setAppState({ columns: [] });
  stateContainer.internalState.transitions.setSavedDataViews([dataViewMock as DataViewListItem]);

  const msgLoading = {
    recordRawType: RecordRawType.PLAIN,
    fetchStatus: FetchStatus.LOADING,
    query,
  };

  const documents$ = new BehaviorSubject(msgLoading) as DataDocuments$;

  return {
    documents$,
    dataViews: dataViewsService ?? discoverServiceMock.dataViews,
    stateContainer,
    savedSearch: savedSearchMock,
  };
}
const query = { sql: 'SELECT * from the-data-view-title' };
const msgComplete = {
  recordRawType: RecordRawType.PLAIN,
  fetchStatus: FetchStatus.COMPLETE,
  result: [
    {
      id: '1',
      raw: { field1: 1, field2: 2 },
      flattened: { field1: 1, field2: 2 },
    } as unknown as DataTableRecord,
  ],
  query,
};

describe('useTextBasedQueryLanguage', () => {
  test('a text based query should change state when loading and finished', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));

    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    expect(replaceUrlAppState).toHaveBeenCalledWith({ index: 'the-data-view-id' });

    replaceUrlAppState.mockReset();

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1', 'field2'],
      });
    });
  });
  test('changing a text based query with different result columns should change state when loading and finished', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(2));
    replaceUrlAppState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });
  test('only changing a text based query with same result columns should not change columns', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(2));
    replaceUrlAppState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    replaceUrlAppState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
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
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
      });
    });
  });
  test('if its not a text based query coming along, it should be ignored', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(2));
    replaceUrlAppState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.DOCUMENT,
      fetchStatus: FetchStatus.COMPLETE,
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
      fetchStatus: FetchStatus.COMPLETE,
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
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    props.stateContainer.appState.getState = jest.fn(() => {
      return { columns: ['field1'], index: 'the-data-view-id' };
    });
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));
    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
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
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    expect(replaceUrlAppState).toHaveBeenCalledWith({
      columns: ['field1'],
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const replaceUrlAppState = jest.fn();
    const props = getHookProps(replaceUrlAppState, query);
    props.stateContainer.appState.getState = jest.fn(() => {
      return { columns: [], index: 'the-data-view-id' };
    });
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));
    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.LOADING,
      query: { sql: 'SELECT * from the-data-view-title WHERE field1=2' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(0));
    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT * from the-data-view-title WHERE field1=2' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    props.stateContainer.appState.getState = jest.fn(() => {
      return { columns: ['field1', 'field2'], index: 'the-data-view-id' };
    });
    replaceUrlAppState.mockReset();

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
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-title' },
    });

    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));
    expect(replaceUrlAppState).toHaveBeenCalledWith({
      columns: ['field1'],
    });
  });

  test('changing a text based query with an index pattern that not corresponds to a dataview should return results', async () => {
    const replaceUrlAppState = jest.fn();
    const dataViewsCreateMock = discoverServiceMock.dataViews.create as jest.Mock;
    dataViewsCreateMock.mockImplementation(() => ({
      ...dataViewMock,
    }));
    const dataViewsService = {
      ...discoverServiceMock.dataViews,
      create: dataViewsCreateMock,
    };
    const props = getHookProps(replaceUrlAppState, query, dataViewsService);
    const { documents$ } = props;

    renderHook(() => useTextBasedQueryLanguage(props));

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(2));
    replaceUrlAppState.mockReset();

    documents$.next({
      recordRawType: RecordRawType.PLAIN,
      fetchStatus: FetchStatus.COMPLETE,
      result: [
        {
          id: '1',
          raw: { field1: 1 },
          flattened: { field1: 1 },
        } as unknown as DataTableRecord,
      ],
      query: { sql: 'SELECT field1 from the-data-view-*' },
    });
    await waitFor(() => expect(replaceUrlAppState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlAppState).toHaveBeenCalledWith({
        index: 'the-data-view-id',
        columns: ['field1'],
      });
    });
  });
});
