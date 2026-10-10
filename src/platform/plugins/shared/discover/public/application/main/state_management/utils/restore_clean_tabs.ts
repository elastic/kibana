/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Restores tabs without unsaved changes from the saved Discover session on reload, so a session
 * updated elsewhere replaces stale local drafts instead of showing them as unsaved changes:
 * 1. Each locally persisted tab records whether it had unsaved changes
 * 2. On reload, tabs recorded as clean are replaced by their saved version
 * A closed tab drops the flag, so reopening it never discards
 * local content.
 */

import { isEqual, isUndefined, omit, omitBy, pick } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import type { DiscoverSession, DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import {
  ProfileStateType,
  type ProfileStateMap,
  type ProfileStateRegistry,
} from '../../../../../common/context_awareness';
import {
  APP_STATE_URL_KEY,
  GLOBAL_STATE_URL_KEY,
  PROFILE_STATE_URL_KEY,
} from '../../../../../common/constants';
import { type DiscoverInternalState, type TabState, TabInitializationStatus } from '../redux/types';
import {
  fromSavedObjectTabToAppState,
  fromSavedObjectTabToTabState,
} from '../redux/tab_mapping_utils';
import type { AppStateUrl } from './cleanup_url_state';

/** Uses current unsaved changes for initialized tabs, retaining the restored flag for other drafts. */
export const selectTabHasUnsavedChangesForPersistence = (
  state: DiscoverInternalState,
  tabId: string
): boolean | undefined => {
  const tab = state.tabs.byId[tabId];
  if (!tab) {
    return undefined;
  }

  const { initializationStatus } = tab.initializationState;
  if (state.tabs.areInitializing || initializationStatus === TabInitializationStatus.InProgress) {
    return undefined;
  }

  if (
    !state.persistedDiscoverSession?.tabs.some(({ id }) => id === tabId) ||
    state.tabs.unsavedIds.includes(tabId)
  ) {
    return true;
  }

  return initializationStatus === TabInitializationStatus.Complete ? false : tab.hasUnsavedChanges;
};

/** Forgets the restored flag, which can be outdated once the tab is closed. */
export const withoutUnsavedChangesFlag = <T extends TabState>(tab: T): T => ({
  ...tab,
  hasUnsavedChanges: undefined,
});

/** Restores saved content for a clean draft while preserving its local-only profile and global state. */
const restoreUnmodifiedSavedTab = ({
  tab,
  savedTab,
  profileStateRegistry,
}: {
  tab: TabState;
  savedTab: DiscoverSessionTab | undefined;
  profileStateRegistry: ProfileStateRegistry;
}): TabState => {
  if (tab.hasUnsavedChanges !== false || !savedTab) {
    return tab;
  }

  // Fields the saved tab does not define, such as the saved query, never count as unsaved
  // changes, so they stay local. Fields it defines replace the local ones, even when unset.
  const restoredTab = fromSavedObjectTabToTabState({
    tab: savedTab,
    existingTab: tab,
    profileStateRegistry,
    initialAppState: fromSavedObjectTabToAppState({ tab: savedTab, localAppState: tab.appState }),
  });

  return {
    ...restoredTab,
    // The search session falls back to running the query when the saved content no longer matches
    initialInternalState: {
      ...restoredTab.initialInternalState,
      searchSessionId: tab.initialInternalState?.searchSessionId,
    },
    globalState: {
      ...tab.globalState,
      ...restoredTab.globalState,
    },
  };
};

/** Replaces each clean draft with its version in the saved session, leaving the others untouched. */
export const restoreUnmodifiedSavedTabs = (
  tabs: TabState[],
  savedSession: DiscoverSession | undefined,
  profileStateRegistry: ProfileStateRegistry
): TabState[] =>
  tabs.map((tab) =>
    restoreUnmodifiedSavedTab({
      tab,
      savedTab: savedSession?.tabs.find(({ id }) => id === tab.id),
      profileStateRegistry,
    })
  );

/** Recognizes a URL matching the stored draft, leaving different or partial shared links untouched. */
const isUrlStateFromTab = ({
  tab,
  appState,
  globalState,
  profileState,
  profileStateRegistry,
}: {
  tab: TabState;
  appState: AppStateUrl | null;
  globalState: GlobalQueryStateFromUrl | null;
  profileState: ProfileStateMap | null;
  profileStateRegistry: ProfileStateRegistry;
}): boolean => {
  const { timeRange: time, refreshInterval, filters } = tab.globalState;
  const profileUrlState = (profileStateMap: ProfileStateMap | undefined) =>
    profileStateRegistry.pickStateByType({
      profileStateMap,
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

  return (
    appState !== null &&
    isEqual(omitBy(appState, isUndefined), omitBy(tab.appState, isUndefined)) &&
    (globalState === null ||
      isEqual(
        omitBy(globalState, isUndefined),
        omitBy({ time, refreshInterval, filters }, isUndefined)
      )) &&
    // Only active profiles are written to the URL; inactive profiles can remain in the draft.
    isEqual(
      profileUrlState(profileState ?? undefined),
      profileUrlState(pick(tab.profileState, Object.keys(profileState ?? {})))
    )
  );
};

/** Updates a clean saved tab's matching URL with its restored state, preserving local-only fields. */
export const updateUrlStateForRestoredTab = async ({
  previousTab,
  restoredTab,
  urlStateStorage,
  profileStateRegistry,
}: {
  previousTab: TabState | undefined;
  restoredTab: TabState | undefined;
  urlStateStorage: IKbnUrlStateStorage;
  profileStateRegistry: ProfileStateRegistry;
}): Promise<void> => {
  if (previousTab?.hasUnsavedChanges !== false || !restoredTab) {
    return;
  }

  const globalState = urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY);
  const profileState = urlStateStorage.get<ProfileStateMap>(PROFILE_STATE_URL_KEY);
  if (
    !isUrlStateFromTab({
      tab: previousTab,
      appState: urlStateStorage.get<AppStateUrl>(APP_STATE_URL_KEY),
      globalState,
      profileState,
      profileStateRegistry,
    })
  ) {
    return;
  }

  const updates = [urlStateStorage.set(APP_STATE_URL_KEY, restoredTab.appState, { replace: true })];
  if (profileState) {
    const restoredProfileState = profileStateRegistry.pickStateByType({
      profileStateMap: pick(restoredTab.profileState, Object.keys(profileState)),
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'expand',
    });
    updates.push(
      urlStateStorage.set(PROFILE_STATE_URL_KEY, restoredProfileState, { replace: true })
    );
  }

  if (restoredTab.attributes.timeRestore) {
    updates.push(
      urlStateStorage.set(
        GLOBAL_STATE_URL_KEY,
        omit(globalState ?? {}, 'time', 'refreshInterval'),
        { replace: true }
      )
    );
  }

  await Promise.all(updates);
};
