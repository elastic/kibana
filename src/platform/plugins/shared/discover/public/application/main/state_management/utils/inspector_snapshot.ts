/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import type { InspectorSnapshot } from '@kbn/inspector-plugin/public';
import type { DiscoverAppLocatorParams } from '../../../../../common';
import type { TabState } from '../redux/types';
import { getTabDataView } from '../redux/runtime_state';
import { createUrlGeneratorState } from './create_search_session_restoration_data_provider';

export const DISCOVER_SNAPSHOT_APP_ID = 'discover';

/** Discover state stored in an Inspector snapshot. */
export interface DiscoverSnapshotAppState {
  locatorParams: DiscoverAppLocatorParams;
  uiState: Pick<TabState['uiState'], 'dataGrid' | 'layout' | 'fieldListExistingFieldsInfo'>;
  visContext: TabState['attributes']['visContext'];
}

/**
 * Builds the snapshot app state: restorable locator params (absolute time, full data view spec,
 * no search session) plus the tab's UI state and histogram vis context.
 */
export const getDiscoverSnapshotAppState = (
  deps: Omit<Parameters<typeof createUrlGeneratorState>[0], 'shouldRestoreSearchSession'>
): DiscoverSnapshotAppState => {
  const { searchSessionId, ...locatorParams } = createUrlGeneratorState({
    ...deps,
    shouldRestoreSearchSession: true,
  });
  const { uiState, attributes } = deps.getCurrentTab();
  const dataView = getTabDataView(deps.getCurrentTabRuntimeState());

  return {
    locatorParams: { ...locatorParams, dataViewSpec: dataView?.toSpec() },
    uiState: pick(uiState, ['dataGrid', 'layout', 'fieldListExistingFieldsInfo']),
    visContext: attributes.visContext,
  };
};

/** Returns the arguments of `openLocatorParamsInNewTab` that restore a snapshot with replay. */
export const getSnapshotRestoreParams = (snapshot: InspectorSnapshot, passthrough = false) => {
  const { locatorParams, uiState, visContext } = snapshot.app?.state as DiscoverSnapshotAppState;
  return {
    params: locatorParams,
    label: snapshot.meta.title ? `${snapshot.meta.title} (snapshot)` : 'Snapshot',
    uiState,
    visContext,
    replay: {
      requests: Object.values(snapshot.requests).flat(),
      meta: snapshot.meta,
      passthrough,
    },
  };
};
