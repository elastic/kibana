/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { AggregateQuery } from '@kbn/es-query';
import { VIEW_MODE } from '@kbn/saved-search-plugin/public';
import { FetchStatus } from '../../../types';
import type {
  DataDocumentsMsg,
  DataMainMsg,
  DataTotalHitsMsg,
  SavedSearchData,
} from '../discover_data_state_container';
import {
  createTabActionInjector,
  internalStateActions,
  type DiscoverAppState,
  type InternalStateStore,
  type TabState,
} from '../redux';
import { buildEsqlFetchSubscribe } from './build_esql_fetch_subscribe';

type UpdateAppStateAndReplaceUrlPayload = Parameters<
  typeof internalStateActions.updateAppStateAndReplaceUrl
>[0];

type UpdateAppStateAndReplaceUrlThunk = ReturnType<
  typeof internalStateActions.updateAppStateAndReplaceUrl
> & {
  meta: {
    actionType: 'updateAppStateAndReplaceUrl';
    payload: UpdateAppStateAndReplaceUrlPayload;
  };
};

type SetProfileStateFieldsToResetAction = ReturnType<
  typeof internalStateActions.setProfileStateFieldsToReset
>;

const initialQuery: AggregateQuery = { esql: 'from the-data-view-title' };

const createRecord = (raw: Record<string, number | string>): DataTableRecord =>
  ({
    id: '1',
    raw,
    flattened: raw,
  } as unknown as DataTableRecord);

const msgComplete: DataDocumentsMsg = {
  fetchStatus: FetchStatus.PARTIAL,
  result: [createRecord({ field1: 1, field2: 2 })],
  query: initialQuery,
};

const createDataSubjects = (): SavedSearchData => {
  const initialMessage = { fetchStatus: FetchStatus.UNINITIALIZED };

  return {
    main$: new BehaviorSubject<DataMainMsg>(initialMessage),
    documents$: new BehaviorSubject<DataDocumentsMsg>(initialMessage),
    totalHits$: new BehaviorSubject<DataTotalHitsMsg>(initialMessage),
  };
};

const createUpdateAppStateAndReplaceUrlThunk = (
  payload: UpdateAppStateAndReplaceUrlPayload
): UpdateAppStateAndReplaceUrlThunk => {
  return Object.assign(async () => undefined, {
    meta: {
      actionType: 'updateAppStateAndReplaceUrl' as const,
      payload,
    },
  }) as unknown as UpdateAppStateAndReplaceUrlThunk;
};

const isUpdateAppStateAndReplaceUrlThunk = (
  action: unknown
): action is UpdateAppStateAndReplaceUrlThunk =>
  typeof action === 'function' &&
  'meta' in action &&
  (action as UpdateAppStateAndReplaceUrlThunk).meta.actionType === 'updateAppStateAndReplaceUrl';

const isSetProfileStateFieldsToResetAction = (
  action: unknown
): action is SetProfileStateFieldsToResetAction =>
  typeof action === 'object' &&
  action !== null &&
  'payload' in action &&
  typeof (action as { payload?: unknown }).payload === 'object' &&
  (action as { payload?: unknown }).payload !== null &&
  'fieldsToReset' in
    ((action as { payload: SetProfileStateFieldsToResetAction['payload'] }).payload ?? {});

const updateAppState = (currentTab: TabState, appState: Partial<DiscoverAppState>): TabState => ({
  ...currentTab,
  appState: {
    ...currentTab.appState,
    ...appState,
  },
});

const setupTest = async ({
  appState,
  defaultFetchStatus = FetchStatus.PARTIAL,
  resetTheHook,
}: {
  appState?: Partial<DiscoverAppState>;
  defaultFetchStatus?: FetchStatus;
  resetTheHook?: boolean;
} = {}) => {
  const tabId = 'test-tab-id';
  const dataSubjects = createDataSubjects();
  const replaceUrlState = internalStateActions.updateAppStateAndReplaceUrl as jest.MockedFunction<
    typeof internalStateActions.updateAppStateAndReplaceUrl
  >;

  let currentTab = {
    id: tabId,
    appState: { columns: [], ...appState },
    defaultProfileState: {
      fieldsToReset: 'none',
    },
  } as TabState;

  const internalState = {
    dispatch: jest.fn(async (action: unknown) => {
      if (isSetProfileStateFieldsToResetAction(action)) {
        currentTab = {
          ...currentTab,
          defaultProfileState: {
            ...currentTab.defaultProfileState,
            ...action.payload.fieldsToReset,
          },
        };
      }

      if (isUpdateAppStateAndReplaceUrlThunk(action)) {
        return action;
      }

      return action;
    }),
  } as unknown as InternalStateStore;

  const { esqlFetchSubscribe, cleanupEsql } = buildEsqlFetchSubscribe({
    internalState,
    dataSubjects,
    getCurrentTab: () => currentTab,
    injectCurrentTab: createTabActionInjector(tabId),
  });

  await esqlFetchSubscribe({
    fetchStatus: defaultFetchStatus,
    query: initialQuery,
  });

  if (resetTheHook) {
    cleanupEsql();
  }

  return {
    tabId,
    dataSubjects,
    replaceUrlState,
    esqlFetchSubscribe,
    cleanupEsql,
    getCurrentTab: () => currentTab,
    setCurrentTabAppState: (nextAppState: Partial<DiscoverAppState>) => {
      currentTab = updateAppState(currentTab, nextAppState);
    },
    setFieldsToReset: (fieldsToReset: TabState['defaultProfileState']['fieldsToReset']) => {
      currentTab = {
        ...currentTab,
        defaultProfileState: {
          ...currentTab.defaultProfileState,
          fieldsToReset,
        },
      };
    },
  };
};

describe('buildEsqlFetchSubscribe', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest
      .spyOn(internalStateActions, 'updateAppStateAndReplaceUrl')
      .mockImplementation((payload) => createUpdateAppStateAndReplaceUrlThunk(payload));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('an ES|QL query should change state when loading and finished', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    replaceUrlState.mockClear();

    await esqlFetchSubscribe(msgComplete);

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
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

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('should change viewMode to undefined (default) if it was PATTERN_LEVEL', async () => {
    const { replaceUrlState, tabId } = await setupTest({
      appState: {
        viewMode: VIEW_MODE.PATTERN_LEVEL,
      },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { viewMode: undefined },
    });
  });

  test('changing an ES|QL query with different result columns should change state when loading and finished', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('changing an ES|QL query with same result columns but a different index pattern should change state when loading and finished', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-2' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('changing a ES|QL query with no transformational commands should not change state when loading and finished if index pattern and columns are the same', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title | where field1 > 0' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title2 | where field1 > 0' },
    });

    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
  });

  test('only changing an ES|QL query with same result columns should not change columns', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('if its not an ES|QL query coming along, it should be ignored', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('it should not overwrite existing state columns on initial fetch', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('should overwrite existing undefined columns on initial fetch if transformational query', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest({
      appState: {
        columns: undefined,
      },
      resetTheHook: true,
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field 1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('should not overwrite existing empty columns on initial fetch even if transformational query', async () => {
    const { replaceUrlState, esqlFetchSubscribe } = await setupTest({
      appState: {
        columns: [],
      },
      resetTheHook: true,
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field 1 | WHERE field1=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('it should not overwrite existing state columns on initial fetch and non transformational commands', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest({
      appState: {
        columns: ['field1'],
      },
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title | WHERE field2=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
  });

  test('it should overwrite existing state columns on transitioning from a query with non transformational commands to a query with transformational', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title | WHERE field2=1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1', 'field2'] },
    });
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('it should not overwrite state column when successfully fetching after an error fetch', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId, setCurrentTabAppState } = await setupTest({
      appState: {
        columns: [],
      },
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | WHERE field1=2' },
    });
    expect(replaceUrlState).toHaveBeenCalledTimes(0);

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1, field2: 2 })],
      query: { esql: 'from the-data-view-title | WHERE field1=2' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    setCurrentTabAppState({ columns: ['field1', 'field2'] });
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | keep field 1; | WHERE field1=2' },
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.ERROR,
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-title | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  test('changing an ES|QL query with an index pattern that not corresponds to a dataview should return results', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    await esqlFetchSubscribe(msgComplete);
    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    replaceUrlState.mockClear();

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord({ field1: 1 })],
      query: { esql: 'from the-data-view-* | keep field1' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: ['field1'] },
    });
  });

  it('should call setProfileStateFieldsToReset correctly when index pattern changes', async () => {
    const { esqlFetchSubscribe, getCurrentTab, setCurrentTabAppState, setFieldsToReset } =
      await setupTest({
        appState: { query: { esql: 'from pattern' } },
        defaultFetchStatus: FetchStatus.LOADING,
      });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
    });

    setCurrentTabAppState({ query: { esql: 'from pattern1' } });
    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('all');

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });

    setCurrentTabAppState({ query: { esql: 'from pattern1' } });
    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern1' },
    });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('all');

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern1' },
    });

    setFieldsToReset('none');
    setCurrentTabAppState({ query: { esql: 'from pattern2' } });

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.LOADING,
      query: { esql: 'from pattern2' },
    });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('all');
  });

  test('non-transformational query with columns above threshold should use summary view', async () => {
    const { replaceUrlState, esqlFetchSubscribe } = await setupTest();

    replaceUrlState.mockClear();

    const manyColumns = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [`field${index + 1}`, index + 1])
    );

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord(manyColumns)],
      query: { esql: 'from the-data-view-title' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(0);
  });

  test('non-transformational query with columns at or below threshold should show individual columns', async () => {
    const { replaceUrlState, esqlFetchSubscribe, tabId } = await setupTest();

    replaceUrlState.mockClear();

    const fewColumns = Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [`field${index + 1}`, index + 1])
    );
    const expectedColumns = Array.from({ length: 5 }, (_, index) => `field${index + 1}`);

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      result: [createRecord(fewColumns)],
      query: { esql: 'from the-data-view-title' },
    });

    expect(replaceUrlState).toHaveBeenCalledTimes(1);
    expect(replaceUrlState).toHaveBeenCalledWith({
      tabId,
      appState: { columns: expectedColumns },
    });
  });

  it('should call setProfileStateFieldsToReset correctly when columns change', async () => {
    const { esqlFetchSubscribe, getCurrentTab } = await setupTest();

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: [createRecord({ message: 'foo' })],
    });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');

    await esqlFetchSubscribe({
      fetchStatus: FetchStatus.PARTIAL,
      query: { esql: 'from pattern' },
      result: [createRecord({ message: 'foo', extension: 'bar' })],
    });

    expect(getCurrentTab().defaultProfileState.fieldsToReset).toEqual(['columns']);
  });
});
