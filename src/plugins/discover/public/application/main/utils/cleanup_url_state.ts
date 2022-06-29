/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isOfAggregateQueryType } from '@kbn/es-query';
import { migrateLegacyQuery } from '../../../utils/migrate_legacy_query';
import { AppState, AppStateUrl } from '../services/discover_state';

/**
 * Takes care of the given url state, migrates legacy props and cleans up empty props
 * @param appStateFromUrl
 */
export function cleanupUrlState(appStateFromUrl: AppStateUrl): AppState {
  if (appStateFromUrl && appStateFromUrl.query && !appStateFromUrl.query.language) {
    if (!isOfAggregateQueryType(appStateFromUrl.query)) {
      appStateFromUrl.query = migrateLegacyQuery(appStateFromUrl.query);
    }
  }

  if (typeof appStateFromUrl?.sort?.[0] === 'string') {
    if (appStateFromUrl?.sort?.[1] === 'asc' || appStateFromUrl.sort[1] === 'desc') {
      // handling sort props like this[fieldName,direction]
      appStateFromUrl.sort = [[appStateFromUrl.sort[0], appStateFromUrl.sort[1]]];
    } else {
      delete appStateFromUrl.sort;
    }
  }

  if (appStateFromUrl?.sort && !appStateFromUrl.sort.length) {
    // If there's an empty array given in the URL, the sort prop should be removed
    // This allows the sort prop to be overwritten with the default sorting
    delete appStateFromUrl.sort;
  }
  return appStateFromUrl as AppState;
}
