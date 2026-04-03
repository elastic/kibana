/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { waitFor } from '@testing-library/react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import type { EsHitRecord } from '@kbn/discover-utils';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { FetchStatus } from '../../../types';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { savedSearchMock } from '../../../../__mocks__/saved_search';
import { internalStateActions } from '../redux';
import type { DiscoverAppState } from '../redux';
import { dataViewAdHoc } from '../../../../__mocks__/data_view_complex';

async function getTestProps({
  query,
  appState,
  defaultFetchStatus = FetchStatus.PARTIAL,
  resetTheHook,
}: {
  query: AggregateQuery | Query | undefined;
  appState?: Partial<DiscoverAppState>;
  defaultFetchStatus?: FetchStatus;
  resetTheHook?: boolean;
}) {
  const replaceUrlState = jest
    .spyOn(internalStateActions, 'updateAppStateAndReplaceUrl')
    .mockClear();

  const toolkit = getDiscoverInternalStateMock({ persistedDataViews: [dataViewMock] });
  await toolkit.initializeTabs();
  const { dataStateContainer: dataState } = await toolkit.initializeSingleTab({
    tabId: toolkit.getCurrentTab().id,
    skipWaitForDataFetching: true,
  });

  toolkit.internalState.dispatch(
    toolkit.injectCurrentTab(internalStateActions.updateAppState)({
      appState: { columns: [], ...appState },
    })
  );

  // Reset the profile state to match the expected initial state for tests
  toolkit.internalState.dispatch(
    toolkit.injectCurrentTab(internalStateActions.setProfileStateFieldsToReset)({
      fieldsToReset: 'none',
    })
  );

  const msgLoading = {
    fetchStatus: defaultFetchStatus,
    query,
  };
  dataState.data$.documents$.next(msgLoading);

  if (resetTheHook) {
    // resets the state of buildEsqlFetchSubscribe hook so it takes the current app state as the initial one
    dataState.cleanupEsql();
  }

  return {
    toolkit,
    dataState,
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

const setupTest = async ({
  appState,
  defaultFetchStatus,
  resetTheHook,
}: {
  appState?: DiscoverAppState;
  defaultFetchStatus?: FetchStatus;
  resetTheHook?: boolean;
} = {}) => {
  const props = await getTestProps({
    query,
    appState,
    defaultFetchStatus,
    resetTheHook,
  });
  const { toolkit } = props;
  toolkit.internalState.dispatch(
    toolkit.injectCurrentTab(internalStateActions.assignNextDataView)({
      dataView: dataViewMock,
    })
  );
  const tabId = toolkit.getCurrentTab().id;
  return { ...props, tabId };
};

// Testing buildEsqlFetchSubscribe through the state container
// since the logic is pretty intertwined with the state management
describe('buildEsqlFetchSubscribe', () => {
  test('an ES|QL query should change state when loading and finished', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest();

    replaceUrlState.mockClear();

    dataState.data$.documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
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
    const { replaceUrlState, tabId } = await setupTest({
      appState: {
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { viewMode: undefined },
    });
  });

  test('changing an ES|QL query with different result columns should change state when loading and finished', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;
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
        tabId,
        appState: { columns: ['field1'] },
      });
    });
  });

  test('changing an ES|QL query with same result columns but a different index pattern should change state when loading and finished', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;
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
        tabId,
        appState: { columns: ['field1'] },
      });
    });
  });

  test('changing a ES|QL query with no transformational commands should not change state when loading and finished if index pattern and columns are the same', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;
    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1, field2: 2 },
        } as unknown as DataTableRecord,
      ],
      // non transformational command, same columns as msgComplete
      query: { esql: 'from the-data-view-title | where field1 > 0' },
    });
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(0));
    replaceUrlState.mockClear();

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: { field1: 1, field2: 2 },
          flattened: { field1: 1, field2: 2 },
        } as unknown as DataTableRecord,
      ],
      // non transformational command, different index
      query: { esql: 'from the-data-view-title2 | where field1 > 0' },
    });
    await waitFor(
      () => {
        expect(replaceUrlState).toHaveBeenCalledWith({
          tabId,
          appState: { columns: ['field1', 'field2'] },
        });
      },
      { timeout: 2000 }
    );
  });

  test('only changing an ES|QL query with same result columns should not change columns', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
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
        tabId,
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
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
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
        tabId,
        appState: { columns: ['field1'] },
      });
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });
    const documents$ = dataState.data$.documents$;
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
        tabId,
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
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('should overwrite existing undefined columns on initial fetch if transformational query', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({
      appState: {
        columns: undefined,
      },
      resetTheHook: true,
    });
    const documents$ = dataState.data$.documents$;
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
        tabId,
        appState: { columns: ['field1'] },
      });
    });
  });

  test('should not overwrite existing empty columns on initial fetch even if transformational query', async () => {
    const { replaceUrlState, dataState } = await setupTest({
      appState: {
        columns: [],
      },
      resetTheHook: true,
    });
    const documents$ = dataState.data$.documents$;
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
    const { replaceUrlState, dataState, tabId } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });
    const documents$ = dataState.data$.documents$;

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
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
  });

  test('it should overwrite existing state columns on transitioning from a query with non transformational commands to a query with transformational', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;

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
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
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
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const { toolkit, replaceUrlState, dataState, tabId } = await setupTest({
      appState: {
        columns: [],
      },
    });
    const documents$ = dataState.data$.documents$;

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
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.updateAppState)({
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
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('changing an ES|QL query with an index pattern that not corresponds to a dataview should return results', async () => {
    const { toolkit, dataState, replaceUrlState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;

    documents$.next(msgComplete);
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
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
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.assignNextDataView)({
        dataView: dataViewAdHoc,
      })
    );
    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));

    await waitFor(() => {
      expect(replaceUrlState).toHaveBeenCalledWith({
        tabId,
        appState: { columns: ['field1'] },
      });
    });
  });

  it('should call setProfileStateFieldsToReset correctly when index pattern changes', async () => {
    const { toolkit, dataState } = await setupTest({
      appState: { query: { esql: 'from pattern' } },
      defaultFetchStatus: FetchStatus.LOADING,
    });
    const documents$ = dataState.data$.documents$;
    expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
    });
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern1' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });
    await waitFor(() =>
      expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('all')
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.setProfileStateFieldsToReset)({
        fieldsToReset: 'none',
      })
    );
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern1' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });
    await waitFor(() =>
      expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none')
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });
    toolkit.internalState.dispatch(
      toolkit.injectCurrentTab(internalStateActions.updateAppState)({
        appState: { query: { esql: 'from pattern2' } },
      })
    );
    documents$.next({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern2' },
    });
    await waitFor(() =>
      expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('all')
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern2' },
    });
  });

  test('non-transformational query with columns above threshold should use summary view', async () => {
    const { replaceUrlState, dataState } = await setupTest({});
    const documents$ = dataState.data$.documents$;
    replaceUrlState.mockClear();

    const manyColumns = Object.fromEntries(
      Array.from({ length: 11 }, (_, i) => [`field${i + 1}`, i + 1])
    );

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: manyColumns,
          flattened: manyColumns,
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('non-transformational query with columns at or below threshold should show individual columns', async () => {
    const { replaceUrlState, dataState, tabId } = await setupTest({});
    const documents$ = dataState.data$.documents$;
    replaceUrlState.mockClear();

    const fewColumns = Object.fromEntries(
      Array.from({ length: 5 }, (_, i) => [`field${i + 1}`, i + 1])
    );
    const expectedColumns = Array.from({ length: 5 }, (_, i) => `field${i + 1}`);

    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      result: [
        {
          id: '1',
          raw: fewColumns,
          flattened: fewColumns,
        } as unknown as DataTableRecord,
      ],
      query: { esql: 'from the-data-view-title' },
    });

    await waitFor(() => expect(replaceUrlState).toHaveBeenCalledTimes(1));
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: expectedColumns },
    });
  });

  it('should call setProfileStateFieldsToReset correctly when columns change', async () => {
    const { toolkit, dataState } = await setupTest({});
    const documents$ = dataState.data$.documents$;
    const result1 = [buildDataTableRecord({ message: 'foo' } as EsHitRecord)];
    const result2 = [buildDataTableRecord({ message: 'foo', extension: 'bar' } as EsHitRecord)];
    expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: result1,
    });
    await waitFor(() =>
      expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none')
    );
    documents$.next({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: result2,
    });
    await waitFor(() =>
      expect(toolkit.getCurrentTab().defaultProfileState.fieldsToReset).toEqual(['columns'])
    );
  });
});
