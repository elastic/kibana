/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EMPTY, Observable } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import {
  nodeBuilder,
  SEARCH_SESSION_TYPE,
  SearchSessionStatus,
  KueryNode,
} from '../../../../../../src/plugins/data/common';
import { checkSearchSessionsByPage, getSearchSessionsPage$ } from './get_search_session_page';
import { CheckSearchSessionsDeps, SearchSessionsResponse } from './types';
import { bulkUpdateSessions, getAllSessionsStatusUpdates } from './update_session_status';
import { SearchSessionsConfigSchema } from '../../../config';

export const SEARCH_SESSIONS_TASK_TYPE = 'search_sessions_monitor';
export const SEARCH_SESSIONS_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_TASK_TYPE}`;

function checkPersistedSessionsPage(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema,
  filter: KueryNode,
  page: number
): Observable<SearchSessionsResponse> {
  const { logger } = deps;
  logger.debug(`${SEARCH_SESSIONS_TASK_TYPE} Fetching sessions from page ${page}`);
  return getSearchSessionsPage$(deps, filter, config.pageSize, page).pipe(
    concatMap(async (persistedSearchSessions) => {
      if (!persistedSearchSessions.total) return persistedSearchSessions;

      logger.debug(
        `${SEARCH_SESSIONS_TASK_TYPE} Found ${persistedSearchSessions.total} sessions, processing ${persistedSearchSessions.saved_objects.length}`
      );

      const updatedSessions = await getAllSessionsStatusUpdates(
        deps,
        config,
        persistedSearchSessions
      );
      await bulkUpdateSessions(deps, updatedSessions);

      return persistedSearchSessions;
    })
  );
}

export function checkPersistedSessionsProgress(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema
) {
  const { logger } = deps;

  const persistedSessionsFilter = nodeBuilder.and([
    nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.persisted`, 'true'),
    nodeBuilder.is(
      `${SEARCH_SESSION_TYPE}.attributes.status`,
      SearchSessionStatus.IN_PROGRESS.toString()
    ),
  ]);

  return checkSearchSessionsByPage(
    checkPersistedSessionsPage,
    deps,
    config,
    persistedSessionsFilter
  ).pipe(
    catchError((e) => {
      logger.error(`${SEARCH_SESSIONS_TASK_TYPE} Error while processing sessions: ${e?.message}`);
      return EMPTY;
    })
  );
}
