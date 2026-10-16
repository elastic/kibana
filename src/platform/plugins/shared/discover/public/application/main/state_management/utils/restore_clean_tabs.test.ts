/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDiscoverSessionMock } from '@kbn/saved-search-plugin/common/mocks';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { createMemoryHistory } from 'history';
import {
  createProfileStateRegistry,
  METRICS_STATE_DEF,
} from '../../../../../common/context_awareness';
import { APP_STATE_URL_KEY, PROFILE_STATE_URL_KEY } from '../../../../../common/constants';
import { getDiscoverInternalStateMock } from '../../../../__mocks__/discover_state.mock';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { getPersistedTabMock, getTabStateMock } from '../redux/__mocks__/internal_state.mocks';
import { TabInitializationStatus, type TabState } from '../redux/types';
import {
  selectTabHasUnsavedChangesForPersistence,
  updateUrlStateForRestoredTab,
} from './restore_clean_tabs';

describe('selectTabHasUnsavedChangesForPersistence', () => {
  it.each<{
    name: string;
    initializationState?: TabState['initializationState'];
    restoredFlag?: boolean;
    unsaved?: boolean;
    saved?: boolean;
    areInitializing?: boolean;
    expected: boolean | undefined;
  }>([
    { name: 'initialized clean tab', restoredFlag: true, expected: false },
    { name: 'initialized modified tab', restoredFlag: false, unsaved: true, expected: true },
    { name: 'new local tab', saved: false, expected: true },
    { name: 'session initialization', areInitializing: true, expected: undefined },
    {
      name: 'tab initialization',
      initializationState: { initializationStatus: TabInitializationStatus.InProgress },
      restoredFlag: false,
      expected: undefined,
    },
    ...[false, true, undefined].map((restoredFlag) => ({
      name: `uninitialized draft with flag ${restoredFlag}`,
      initializationState: { initializationStatus: TabInitializationStatus.NotStarted as const },
      restoredFlag,
      expected: restoredFlag,
    })),
  ])(
    '$name',
    ({
      initializationState,
      restoredFlag,
      unsaved,
      saved = true,
      areInitializing = false,
      expected,
    }) => {
      const { internalState, services } = getDiscoverInternalStateMock();
      const initialState = internalState.getState();
      const tab = getTabStateMock({
        id: 'tab',
        hasUnsavedChanges: restoredFlag,
        initializationState: initializationState ?? {
          initializationStatus: TabInitializationStatus.Complete,
        },
      });
      const savedTab = getPersistedTabMock({
        tabId: tab.id,
        dataView: dataViewWithTimefieldMock,
        services,
      });
      const state = {
        ...initialState,
        persistedDiscoverSession: createDiscoverSessionMock({
          id: 'session',
          tabs: saved ? [savedTab] : [],
        }),
        tabs: {
          ...initialState.tabs,
          byId: { [tab.id]: tab },
          allIds: [tab.id],
          unsavedIds: unsaved ? [tab.id] : [],
          areInitializing,
        },
      };

      expect(selectTabHasUnsavedChangesForPersistence(state, tab.id)).toBe(expected);
    }
  );

  it('returns an unknown state for a missing tab', () => {
    const { internalState } = getDiscoverInternalStateMock();
    expect(
      selectTabHasUnsavedChangesForPersistence(internalState.getState(), 'missing-tab')
    ).toBeUndefined();
  });
});

describe('updateUrlStateForRestoredTab', () => {
  const previousTab = getTabStateMock({
    id: 'tab',
    hasUnsavedChanges: false,
    appState: { columns: ['message'] },
    profileState: { metricsState: { sortDirection: 'desc' } },
  });
  const restoredTab = {
    ...previousTab,
    appState: { columns: ['host.name'] },
    profileState: { metricsState: { gaugeAggregation: 'max', sortDirection: 'desc' } },
  };
  const sharedProfileState = { metricsState: { gaugeAggregation: 'min', sortDirection: 'desc' } };

  it.each([
    {
      name: 'updates a matching Metrics URL, preserving local sorting',
      profileState: { metricsState: { gaugeAggregation: 'avg', sortDirection: 'desc' } },
      expectedAppState: restoredTab.appState,
      expectedProfileState: {
        metricsState: {
          ...METRICS_STATE_DEF.defaultState,
          gaugeAggregation: 'max',
          sortDirection: 'desc',
        },
      },
    },
    {
      name: 'preserves a shared link with different Metrics settings',
      profileState: sharedProfileState,
      expectedAppState: previousTab.appState,
      expectedProfileState: sharedProfileState,
    },
    {
      name: 'updates the app URL without restoring an inactive profile to the URL',
      profileState: undefined,
      expectedAppState: restoredTab.appState,
      expectedProfileState: null,
    },
  ])('$name', async ({ profileState, expectedAppState, expectedProfileState }) => {
    const urlStateStorage = createKbnUrlStateStorage({
      history: createMemoryHistory(),
      useHash: false,
    });
    await urlStateStorage.set(APP_STATE_URL_KEY, previousTab.appState);
    await urlStateStorage.set(PROFILE_STATE_URL_KEY, profileState);

    await updateUrlStateForRestoredTab({
      previousTab,
      restoredTab,
      urlStateStorage,
      profileStateRegistry: createProfileStateRegistry(),
    });

    expect(urlStateStorage.get(APP_STATE_URL_KEY)).toEqual(expectedAppState);
    expect(urlStateStorage.get(PROFILE_STATE_URL_KEY)).toEqual(expectedProfileState);
  });
});
