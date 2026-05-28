/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { DataPublicPluginStart, SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import type { DiscoverSession } from '@kbn/saved-search-plugin/common';
import type { ProfileStateRegistry } from '../../../../context_awareness';
import type { ReactiveTabRuntimeState, TabState } from '../redux';
import { DISCOVER_APP_LOCATOR, type DiscoverAppLocatorParams } from '../../../../../common';
import { getProfileUrlState } from './get_profile_url_state';

export function createSearchSessionRestorationDataProvider(deps: {
  data: DataPublicPluginStart;
  profileStateRegistry?: ProfileStateRegistry;
  getPersistedDiscoverSession: () => DiscoverSession | undefined;
  getCurrentTab: () => TabState;
  getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
}): SearchSessionInfoProvider {
  return {
    getName: async () => {
      return (
        deps.getPersistedDiscoverSession()?.title ||
        i18n.translate('discover.discoverDefaultSearchSessionName', {
          defaultMessage: 'Discover',
        })
      );
    },
    getLocatorData: async () => {
      return {
        id: DISCOVER_APP_LOCATOR,
        initialState: createUrlGeneratorState({
          ...deps,
          shouldRestoreSearchSession: false,
        }),
        restoreState: createUrlGeneratorState({
          ...deps,
          shouldRestoreSearchSession: true,
        }),
      };
    },
  };
}

function createUrlGeneratorState({
  data,
  getPersistedDiscoverSession,
  getCurrentTab,
  getCurrentTabRuntimeState,
  profileStateRegistry,
  shouldRestoreSearchSession,
}: {
  data: DataPublicPluginStart;
  profileStateRegistry?: ProfileStateRegistry;
  getPersistedDiscoverSession: () => DiscoverSession | undefined;
  getCurrentTab: () => TabState;
  getCurrentTabRuntimeState: () => ReactiveTabRuntimeState;
  shouldRestoreSearchSession: boolean;
}): DiscoverAppLocatorParams {
  const currentTab = getCurrentTab();
  const appState = currentTab.appState;
  const currentTabRuntimeState = getCurrentTabRuntimeState();
  const dataView = currentTabRuntimeState.currentDataView$.getValue();
  const activeProfileStateDefinition = currentTabRuntimeState.scopedProfilesManager$
    .getValue()
    .getContexts().dataSourceContext.profileState;
  const profileUrlState =
    activeProfileStateDefinition && profileStateRegistry
      ? getProfileUrlState({
          definition: activeProfileStateDefinition,
          profileState: currentTab.profileState,
          profileStateRegistry,
        })
      : undefined;

  return {
    filters: data.query.filterManager.getFilters(),
    dataViewId: dataView?.id,
    query: appState.query,
    savedSearchId: getPersistedDiscoverSession()?.id,
    timeRange: shouldRestoreSearchSession
      ? data.query.timefilter.timefilter.getAbsoluteTime()
      : data.query.timefilter.timefilter.getTime(),
    searchSessionId: shouldRestoreSearchSession ? data.search.session.getSessionId() : undefined,
    columns: appState.columns,
    grid: appState.grid,
    sort: appState.sort,
    savedQuery: appState.savedQuery,
    interval: appState.interval,
    refreshInterval: shouldRestoreSearchSession
      ? {
          pause: true, // force pause refresh interval when restoring a session
          value: 0,
        }
      : undefined,
    useHash: false,
    viewMode: appState.viewMode,
    hideAggregatedPreview: appState.hideAggregatedPreview,
    breakdownField: appState.breakdownField,
    profileUrlState,
    dataViewSpec: !dataView?.isPersisted() ? dataView?.toMinimalSpec() : undefined,
    ...(shouldRestoreSearchSession
      ? {
          hideChart: appState.hideChart ?? false,
          hideTable: appState.hideTable ?? false,
          sampleSize: appState.sampleSize,
        }
      : {}),
  };
}
