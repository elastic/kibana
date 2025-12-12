/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter } from '@kbn/es-query';
import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type { ContextHistoryLocationState, DiscoverContextAppLocatorGetLocation } from './locator';
import { APP_STATE_URL_KEY } from '../../../../common';

export const contextAppLocatorGetLocation = async (
  { useHash }: { useHash: boolean },
  ...[params]: Parameters<DiscoverContextAppLocatorGetLocation>
): ReturnType<DiscoverContextAppLocatorGetLocation> => {
  const { index, rowId, columns, filters, referrer } = params;

  const appState: { filters?: Filter[]; columns?: string[] } = {};
  const queryState: GlobalQueryStateFromUrl = {};

  const { isFilterPinned } = await import('@kbn/es-query');
  if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
  if (columns) appState.columns = columns;

  if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));

  let dataViewId;
  const state: ContextHistoryLocationState = { referrer };
  if (typeof index === 'object') {
    state.dataViewSpec = index;
    dataViewId = index.id!;
  } else {
    dataViewId = index;
  }

  let path = `#/context/${dataViewId}/${encodeURIComponent(rowId)}`;

  if (Object.keys(queryState).length) {
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
  }

  if (Object.keys(appState).length) {
    path = setStateToKbnUrl(APP_STATE_URL_KEY, appState, { useHash }, path);
  }

  return {
    app: 'discover',
    path,
    state,
  };
};
