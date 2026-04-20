/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subject } from 'rxjs';
import { waitFor } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock, esHitsMockWithSort } from '@kbn/discover-utils/src/__mocks__';
import { createDiscoverServicesMock, discoverServiceMock } from '../../../__mocks__/services';
import { FetchStatus } from '../../types';
import type { DataDocuments$ } from './discover_data_state_container';
import {
  getDiscoverInternalStateMock,
  getDiscoverStateMock,
  initializeDataStateInDiscoverStateMock,
} from '../../../__mocks__/discover_state.mock';
import { fetchDocuments } from '../data_fetching/fetch_documents';
import { internalStateActions, selectDataSourceProfileId, selectTabRuntimeState } from './redux';

jest.mock('../data_fetching/fetch_documents', () => ({
  fetchDocuments: jest.fn().mockResolvedValue({ records: [] }),
}));

jest.mock('../data_fetching/fetch_esql', () => ({
  fetchEsql: jest.fn().mockResolvedValue({ records: [] }),
}));

jest.mock('@kbn/ebt-tools', () => ({
  reportPerformanceMetricEvent: jest.fn(),
}));

const mockFetchDocuments = jest.mocked(fetchDocuments);

describe('test getDataStateContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('return is valid', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const dataState = initializeDataStateInDiscoverStateMock(stateContainer);

    expect(dataState.refetch$).toBeInstanceOf(Subject);
    expect(dataState.data$.main$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.documents$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
    expect(dataState.data$.totalHits$.getValue().fetchStatus).toBe(FetchStatus.LOADING);
  });

  test('refetch$ triggers a search', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    jest.spyOn(stateContainer.searchSessionManager, 'getNextSearchSessionId');
    expect(
      stateContainer.searchSessionManager.getNextSearchSessionId as jest.Mock
    ).not.toHaveBeenCalled();

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = initializeDataStateInDiscoverStateMock(stateContainer);
    const unsubscribe = dataState.subscribe();
    const { scopedProfilesManager$ } = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    );
    const resolveDataSourceProfileSpy = jest.spyOn(
      scopedProfilesManager$.getValue(),
      'resolveDataSourceProfile'
    );

    expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
    expect(dataState.data$.totalHits$.value.result).toBe(undefined);
    expect(dataState.data$.documents$.value.result).toEqual(undefined);

    dataState.refetch$.next(undefined);
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe('complete');
    });

    expect(resolveDataSourceProfileSpy).toHaveBeenCalledTimes(1);
    expect(resolveDataSourceProfileSpy).toHaveBeenCalledWith(
      {
        dataSource: stateContainer.getCurrentTab().appState.dataSource,
        dataView: selectTabRuntimeState(
          stateContainer.runtimeStateManager,
          stateContainer.getCurrentTab().id
        ).currentDataView$.getValue(),
        query: stateContainer.getCurrentTab().appState.query,
      },
      expect.any(Function)
    );
    expect(dataState.data$.totalHits$.value.result).toBe(0);
    expect(dataState.data$.documents$.value.result).toEqual([]);

    // gets a new search session id
    expect(
      stateContainer.searchSessionManager.getNextSearchSessionId as jest.Mock
    ).toHaveBeenCalled();

    unsubscribe();
  });

  test('reset sets back to initial state', async () => {
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });

    discoverServiceMock.data.query.timefilter.timefilter.getTime = jest.fn(() => {
      return { from: '2021-05-01T20:00:00Z', to: '2021-05-02T20:00:00Z' };
    });

    const dataState = initializeDataStateInDiscoverStateMock(stateContainer);
    const unsubscribe = dataState.subscribe();

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    });

    dataState.refetch$.next(undefined);

    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
    });
    dataState.reset();
    await waitFor(() => {
      expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.LOADING);
    });
    unsubscribe();
  });

  test('refetch$ accepts "fetch_more" signal', (done) => {
    const records = esHitsMockWithSort.map((hit) => buildDataTableRecord(hit, dataViewMock));
    const initialRecords = [records[0], records[1]];
    const moreRecords = [records[2], records[3]];

    mockFetchDocuments.mockResolvedValue({ records: moreRecords });

    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const dataState = initializeDataStateInDiscoverStateMock(stateContainer);
    dataState.data$.documents$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
      result: initialRecords,
    }) as DataDocuments$;

    const unsubscribe = dataState.subscribe();
    const { scopedProfilesManager$ } = selectTabRuntimeState(
      stateContainer.runtimeStateManager,
      stateContainer.getCurrentTab().id
    );
    const resolveDataSourceProfileSpy = jest.spyOn(
      scopedProfilesManager$.getValue(),
      'resolveDataSourceProfile'
    );

    expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
    expect(dataState.data$.documents$.value.result).toEqual(initialRecords);

    let hasLoadingMoreStarted = false;

    dataState.data$.documents$.subscribe((value) => {
      if (value.fetchStatus === FetchStatus.LOADING_MORE) {
        hasLoadingMoreStarted = true;
        return;
      }

      if (hasLoadingMoreStarted && value.fetchStatus === FetchStatus.COMPLETE) {
        expect(resolveDataSourceProfileSpy).not.toHaveBeenCalled();
        expect(value.result).toEqual([...initialRecords, ...moreRecords]);
        unsubscribe();
        done();
      }
    });

    dataState.refetch$.next('fetch_more');
  });

  describe('default profile state', () => {
    it('should populate snapshotsByProfileId when the data source profile changes', async () => {
      const toolkit = getDiscoverInternalStateMock();

      await toolkit.initializeTabs();
      const tabId = toolkit.getCurrentTab().id;
      await toolkit.initializeSingleTab({
        tabId,
        skipWaitForDataFetching: true,
      });

      const fetchDocumentsDeferred = Promise.withResolvers<{ records: never[] }>();

      mockFetchDocuments.mockImplementation(() => fetchDocumentsDeferred.promise);

      const { scopedProfilesManager$ } = selectTabRuntimeState(toolkit.runtimeStateManager, tabId);
      const previousProfileId = selectDataSourceProfileId(toolkit.runtimeStateManager, tabId);

      jest
        .spyOn(scopedProfilesManager$.getValue(), 'resolveDataSourceProfile')
        .mockResolvedValue({ didProfileChange: true });

      toolkit.internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId,
          dataView: dataViewMock,
        })
      );
      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId,
          appState: {
            columns: ['custom_column'],
            rowHeight: 5,
            breakdownField: 'extension',
            hideChart: true,
          },
        })
      );
      toolkit.internalState.dispatch(
        internalStateActions.setProfileStateFieldsToReset({
          tabId,
          fieldsToReset: ['columns', 'rowHeight'],
        })
      );

      await waitFor(() => {
        const currentTab = toolkit.getCurrentTab();

        expect(currentTab.defaultProfileState.fieldsToReset).toEqual(['columns', 'rowHeight']);
        expect(currentTab.defaultProfileState.snapshotsByProfileId[previousProfileId]).toEqual({
          columns: ['custom_column'],
          rowHeight: 5,
          breakdownField: 'extension',
          hideChart: true,
        });
      });

      fetchDocumentsDeferred.resolve({ records: [] });
    });

    it('should restore previous state without applying default profile state for a previously resolved profile', async () => {
      const toolkit = getDiscoverInternalStateMock();

      await toolkit.initializeTabs();
      const tabId = toolkit.getCurrentTab().id;
      await toolkit.initializeSingleTab({
        tabId,
        skipWaitForDataFetching: true,
      });

      const fetchDocumentsDeferred = Promise.withResolvers<{ records: never[] }>();

      mockFetchDocuments.mockImplementation(() => fetchDocumentsDeferred.promise);

      const { scopedProfilesManager$ } = selectTabRuntimeState(toolkit.runtimeStateManager, tabId);
      const scopedProfilesManager = scopedProfilesManager$.getValue();
      const initialContexts = scopedProfilesManager.getContexts();
      const incomingProfileId = 'incoming-profile-id';
      const incomingContexts = {
        ...initialContexts,
        dataSourceContext: {
          ...initialContexts.dataSourceContext,
          profileId: incomingProfileId,
        },
      };
      let currentContexts = initialContexts;
      jest.spyOn(scopedProfilesManager, 'getContexts').mockImplementation(() => currentContexts);

      jest.spyOn(scopedProfilesManager, 'resolveDataSourceProfile').mockImplementation(async () => {
        currentContexts = incomingContexts;

        return { didProfileChange: true };
      });

      toolkit.internalState.dispatch(
        internalStateActions.assignNextDataView({
          tabId,
          dataView: dataViewMock,
        })
      );
      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId,
          appState: {
            columns: ['custom_column'],
            rowHeight: 5,
            breakdownField: 'custom_breakdown',
            hideChart: false,
          },
        })
      );
      toolkit.internalState.dispatch(
        internalStateActions.setProfileStateFieldsToReset({
          tabId,
          fieldsToReset: ['columns', 'rowHeight', 'breakdownField', 'hideChart'],
        })
      );

      currentContexts = incomingContexts;
      toolkit.internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            ...toolkit.getCurrentTab().appState,
            columns: ['restored_column'],
            rowHeight: 2,
            breakdownField: 'restored_breakdown',
            hideChart: false,
          },
        })
      );

      currentContexts = initialContexts;
      toolkit.internalState.dispatch(
        internalStateActions.setAppState({
          tabId,
          appState: {
            ...toolkit.getCurrentTab().appState,
            columns: ['custom_column'],
            rowHeight: 5,
          },
        })
      );

      currentContexts = incomingContexts;

      const expectRestoredState = () => {
        expect(toolkit.getCurrentTab().appState.columns).toEqual(['restored_column']);
        expect(toolkit.getCurrentTab().appState.rowHeight).toBe(2);
        expect(toolkit.getCurrentTab().appState.breakdownField).toBe('restored_breakdown');
        expect(toolkit.getCurrentTab().appState.hideChart).toBe(false);
      };

      await waitFor(() => {
        expectRestoredState();
      });

      fetchDocumentsDeferred.resolve({ records: [] });

      await waitFor(() => {
        expectRestoredState();
      });
    });

    it('should update app state from default profile state', async () => {
      mockFetchDocuments.mockResolvedValue({ records: [] });
      const stateContainer = getDiscoverStateMock({ isTimeBased: true });
      const dataState = initializeDataStateInDiscoverStateMock(stateContainer);
      const dataUnsub = dataState.subscribe();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.initializeAndSync)()
      );
      const { scopedProfilesManager$ } = selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        stateContainer.getCurrentTab().id
      );

      await scopedProfilesManager$.getValue().resolveDataSourceProfile({});
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.assignNextDataView)({
          dataView: dataViewMock,
        })
      );
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.setProfileStateFieldsToReset)({
          fieldsToReset: ['columns', 'rowHeight', 'breakdownField'],
        })
      );

      dataState.data$.totalHits$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: 0,
      });
      dataState.refetch$.next(undefined);

      await waitFor(() => {
        expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
      });
      expect(stateContainer.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');
      expect(stateContainer.getCurrentTab().appState.columns).toEqual(['message', 'extension']);
      expect(stateContainer.getCurrentTab().appState.rowHeight).toEqual(3);
      dataUnsub();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.stopSyncing)()
      );
    });

    it('should not update app state from default profile state', async () => {
      const stateContainer = getDiscoverStateMock({ isTimeBased: true });
      const dataState = initializeDataStateInDiscoverStateMock(stateContainer);
      const dataUnsub = dataState.subscribe();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.initializeAndSync)()
      );
      const { scopedProfilesManager$ } = selectTabRuntimeState(
        stateContainer.runtimeStateManager,
        stateContainer.getCurrentTab().id
      );

      await scopedProfilesManager$.getValue().resolveDataSourceProfile({});
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.assignNextDataView)({
          dataView: dataViewMock,
        })
      );
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.setProfileStateFieldsToReset)({
          fieldsToReset: 'none',
        })
      );
      dataState.data$.totalHits$.next({
        fetchStatus: FetchStatus.COMPLETE,
        result: 0,
      });
      dataState.refetch$.next(undefined);
      await waitFor(() => {
        expect(dataState.data$.main$.value.fetchStatus).toBe(FetchStatus.COMPLETE);
      });
      expect(stateContainer.getCurrentTab().defaultProfileState.fieldsToReset).toEqual('none');
      expect(stateContainer.getCurrentTab().appState.columns).toEqual(['default_column']);
      expect(stateContainer.getCurrentTab().appState.rowHeight).toBeUndefined();
      dataUnsub();
      stateContainer.internalState.dispatch(
        stateContainer.injectCurrentTab(internalStateActions.stopSyncing)()
      );
    });
  });

  describe('cascaded documents', () => {
    const setup = async ({ featureFlagEnabled = true }: { featureFlagEnabled?: boolean } = {}) => {
      const services = createDiscoverServicesMock();

      jest
        .spyOn(services.discoverFeatureFlags, 'getCascadeLayoutEnabled')
        .mockReturnValue(featureFlagEnabled);

      const toolkit = getDiscoverInternalStateMock({ services });

      await toolkit.initializeTabs();

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            query: {
              esql: 'FROM test | STATS count() BY colA, colB',
            },
          },
        })
      );

      await toolkit.initializeSingleTab({
        tabId: toolkit.getCurrentTab().id,
        skipWaitForDataFetching: true,
      });

      return { toolkit };
    };

    it('should update available and selected cascade groups after fetching', async () => {
      const { toolkit } = await setup();

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([]);

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colA',
        'colB',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colA',
      ]);
    });

    it('should not update cascade groups if feature flag is disabled', async () => {
      const { toolkit } = await setup({ featureFlagEnabled: false });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([]);

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([]);
    });

    it('should reset selected cascade groups when available groups change', async () => {
      const { toolkit } = await setup();

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colA',
        'colB',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colA',
      ]);

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            query: {
              esql: 'FROM test | STATS count() BY colC, colD',
            },
          },
        })
      );

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colC',
        'colD',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colC',
      ]);
    });

    it('should keep selected cascade groups when available groups do not change', async () => {
      const { toolkit } = await setup();

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colA',
        'colB',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colA',
      ]);

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            query: {
              esql: 'FROM test | STATS count() BY colB, colA',
            },
          },
        })
      );

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colB',
        'colA',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colA',
      ]);
    });

    it('should clear cascade groups when query is not ES|QL', async () => {
      const { toolkit } = await setup();

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([
        'colA',
        'colB',
      ]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([
        'colA',
      ]);

      toolkit.internalState.dispatch(
        internalStateActions.updateAppState({
          tabId: toolkit.getCurrentTab().id,
          appState: {
            query: {
              language: 'kuery',
              query: 'response:200',
            },
          },
        })
      );

      await toolkit.waitForDataFetching({ tabId: toolkit.getCurrentTab().id });

      expect(toolkit.getCurrentTab().cascadedDocumentsState.availableCascadeGroups).toEqual([]);
      expect(toolkit.getCurrentTab().cascadedDocumentsState.selectedCascadeGroups).toEqual([]);
    });
  });
});
