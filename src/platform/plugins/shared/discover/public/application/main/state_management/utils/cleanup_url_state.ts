/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual, isUndefined, omit, omitBy, pick } from 'lodash';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { DOC_VIEWER_SHAREABLE_STATE_MAX_LENGTH } from '@kbn/unified-doc-viewer';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverAppState, TabState } from '../redux';
import { migrateLegacyQuery } from '../../../../utils/migrate_legacy_query';
import { getMaxAllowedSampleSize } from '../../../../utils/get_allowed_sample_size';
import { createDataViewDataSource, createEsqlDataSource } from '../../../../../common/data_sources';
import {
  APP_STATE_URL_KEY,
  GLOBAL_STATE_URL_KEY,
  PROFILE_STATE_URL_KEY,
} from '../../../../../common/constants';
import {
  ProfileStateType,
  type ProfileStateMap,
  type ProfileStateRegistry,
} from '../../../../../common/context_awareness';
import { isEqualState } from './state_comparators';

export interface AppStateUrl extends Omit<DiscoverAppState, 'sort'> {
  /**
   * Necessary to take care of legacy links [fieldName,direction]
   */
  sort?: string[][] | [string, string];
  /**
   * Legacy data view ID prop
   */
  index?: string;
  /**
   * Legacy ESQL approximate
   */
  isApproximate?: boolean;
}

/**
 * Takes care of the given url state, migrates legacy props and cleans up empty props
 * @param appStateFromUrl
 * @param uiSettings
 */
export function cleanupUrlState(
  appStateFromUrl: AppStateUrl | null | undefined,
  uiSettings: IUiSettingsClient
): DiscoverAppState | undefined {
  if (!appStateFromUrl) {
    return;
  }

  const query = appStateFromUrl.query;
  const isEsqlQuery = isOfAggregateQueryType(query);

  if (!isEsqlQuery && query && !query.language) {
    appStateFromUrl.query = migrateLegacyQuery(query);
  }

  if (typeof appStateFromUrl.sort?.[0] === 'string') {
    if (appStateFromUrl.sort?.[1] === 'asc' || appStateFromUrl.sort[1] === 'desc') {
      // handling sort props like this[fieldName,direction]
      appStateFromUrl.sort = [[appStateFromUrl.sort[0], appStateFromUrl.sort[1]]];
    } else {
      delete appStateFromUrl.sort;
    }
  }

  if (appStateFromUrl.sort && !appStateFromUrl.sort.length) {
    // If there's an empty array given in the URL, the sort prop should be removed
    // This allows the sort prop to be overwritten with the default sorting
    delete appStateFromUrl.sort;
  }

  if (
    appStateFromUrl.rowsPerPage &&
    !(typeof appStateFromUrl.rowsPerPage === 'number' && appStateFromUrl.rowsPerPage > 0)
  ) {
    // remove the param if it's invalid
    delete appStateFromUrl.rowsPerPage;
  }

  if (
    appStateFromUrl.sampleSize &&
    (isEsqlQuery || // not supported yet for ES|QL
      !(
        typeof appStateFromUrl.sampleSize === 'number' &&
        appStateFromUrl.sampleSize > 0 &&
        appStateFromUrl.sampleSize <= getMaxAllowedSampleSize(uiSettings)
      ))
  ) {
    // remove the param if it's invalid
    delete appStateFromUrl.sampleSize;
  }

  let migratedDataViewId: string | undefined;

  // Migrate legacy index parameter
  if (appStateFromUrl.index) {
    migratedDataViewId = appStateFromUrl.index;
    delete appStateFromUrl.index;
  }

  if (!appStateFromUrl.dataSource) {
    if (isEsqlQuery) {
      // Use ES|QL data source for ES|QL queries
      appStateFromUrl.dataSource = createEsqlDataSource();
    } else if (migratedDataViewId) {
      // Use data view data source for migrated data view IDs
      appStateFromUrl.dataSource = createDataViewDataSource({ dataViewId: migratedDataViewId });
    }
  }

  // Migrate legacy isApproximate
  if (
    typeof appStateFromUrl.esqlApproximation !== 'boolean' &&
    typeof appStateFromUrl.isApproximate === 'boolean'
  ) {
    appStateFromUrl.esqlApproximation = appStateFromUrl.isApproximate;
  }
  delete appStateFromUrl.isApproximate;

  // Drop shareable doc viewer state that isn't a plain object or exceeds the size budget, guarding
  // against unbounded URL input. The doc viewer validates the per-tab slices against each tab's
  // schema when restoring them.
  const { docViewerState } = appStateFromUrl;
  if (
    docViewerState &&
    (typeof docViewerState !== 'object' ||
      JSON.stringify(docViewerState).length > DOC_VIEWER_SHAREABLE_STATE_MAX_LENGTH)
  ) {
    delete appStateFromUrl.docViewerState;
  }

  return appStateFromUrl as DiscoverAppState;
}

export function getCurrentUrlState(stateStorage: IKbnUrlStateStorage, services: DiscoverServices) {
  return (
    cleanupUrlState(stateStorage.get<AppStateUrl>(APP_STATE_URL_KEY) ?? {}, services.uiSettings) ??
    {}
  );
}

/**
 * After a session is saved elsewhere, clears URL state matching the old local draft,
 * preserving links that carry different state.
 */
export const clearOutdatedTabUrlState = async ({
  tab,
  timeRestore,
  urlStateStorage,
  profileStateRegistry,
}: {
  tab: TabState;
  timeRestore: boolean;
  urlStateStorage: IKbnUrlStateStorage;
  profileStateRegistry: ProfileStateRegistry;
}): Promise<void> => {
  const isDraftUrl = doesUrlMatchTab({
    tab,
    appState: urlStateStorage.get<DiscoverAppState>(APP_STATE_URL_KEY),
    profileState: urlStateStorage.get<ProfileStateMap>(PROFILE_STATE_URL_KEY),
    profileStateRegistry,
  });

  if (!isDraftUrl) {
    return;
  }

  const updates = [
    urlStateStorage.set(APP_STATE_URL_KEY, undefined, { replace: true }),
    urlStateStorage.set(PROFILE_STATE_URL_KEY, undefined, { replace: true }),
  ];

  const globalState = urlStateStorage.get<GlobalQueryStateFromUrl>(GLOBAL_STATE_URL_KEY);

  // A time different from the draft's is an explicit override, so it is kept.
  if (timeRestore && globalState && isEqual(globalState.time, tab.globalState.timeRange)) {
    updates.push(
      urlStateStorage.set(GLOBAL_STATE_URL_KEY, omit(globalState, 'time', 'refreshInterval'), {
        replace: true,
      })
    );
  }

  await Promise.all(updates);
};

// Checks whether the URL state matches the stored draft; it cannot tell a reload from an identical shared link.
// The global state is not compared because other apps update it in the tracked Discover URL.
const doesUrlMatchTab = ({
  tab,
  appState,
  profileState,
  profileStateRegistry,
}: {
  tab: TabState;
  appState: DiscoverAppState | null;
  profileState: ProfileStateMap | null;
  profileStateRegistry: ProfileStateRegistry;
}): boolean => {
  const profileUrlState = (profileStateMap: ProfileStateMap | undefined) =>
    profileStateRegistry.pickStateByType({
      profileStateMap,
      stateTypes: [ProfileStateType.Url],
      defaultsHandling: 'strip',
    });

  // A URL part that is absent carries nothing of its own, so it matches the draft.
  const isSameAppState =
    !appState || isEqualState(omitBy(appState, isUndefined), omitBy(tab.appState, isUndefined));
  // Only active profiles are written to the URL; inactive profiles can remain in the draft.
  const activeProfileIds = Object.keys(profileState ?? {});
  const isSameProfileState = isEqual(
    profileUrlState(profileState ?? undefined),
    profileUrlState(pick(tab.profileState, activeProfileIds))
  );

  return isSameAppState && isSameProfileState;
};
