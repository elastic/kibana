/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsFindResult } from 'kibana/server';
import moment from 'moment';
import { EMPTY } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import {
  nodeBuilder,
  ENHANCED_ES_SEARCH_STRATEGY,
  SEARCH_SESSION_TYPE,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
  KueryNode,
} from '../../../../../../src/plugins/data/common';
import { checkSearchSessionsByPage, getSearchSessionsPage$ } from './get_search_session_page';
import { CheckSearchSessionsDeps, SearchStatus } from './types';
import { bulkUpdateSessions, getAllSessionsStatusUpdates } from './update_session_status';
import { SearchSessionsConfigSchema } from '../../../config';

export const SEARCH_SESSIONS_CLEANUP_TASK_TYPE = 'search_sessions_cleanup';
export const SEARCH_SESSIONS_CLEANUP_TASK_ID = `data_enhanced_${SEARCH_SESSIONS_CLEANUP_TASK_TYPE}`;

function isSessionStale(
  session: SavedObjectsFindResult<SearchSessionSavedObjectAttributes>,
  config: SearchSessionsConfigSchema
) {
  const curTime = moment();
  // Delete cancelled sessions immediately
  if (session.attributes.status === SearchSessionStatus.CANCELLED) return true;
  // Delete if a running session wasn't polled for in the last notTouchedInProgressTimeout OR
  // if a completed \ errored \ canceled session wasn't saved for within notTouchedTimeout
  return (
    (session.attributes.status === SearchSessionStatus.IN_PROGRESS &&
      curTime.diff(moment(session.attributes.touched), 'ms') >
        config.notTouchedInProgressTimeout.asMilliseconds()) ||
    (session.attributes.status !== SearchSessionStatus.IN_PROGRESS &&
      curTime.diff(moment(session.attributes.touched), 'ms') >
        config.notTouchedTimeout.asMilliseconds())
  );
}

function checkNonPersistedSessionsPage(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema,
  filter: KueryNode,
  page: number
) {
  const { logger, client, savedObjectsClient } = deps;
  logger.debug(`${SEARCH_SESSIONS_CLEANUP_TASK_TYPE} Fetching sessions from page ${page}`);
  return getSearchSessionsPage$(deps, filter, config.pageSize, page).pipe(
    concatMap(async (nonPersistedSearchSessions) => {
      if (!nonPersistedSearchSessions.total) return nonPersistedSearchSessions;

      logger.debug(
        `${SEARCH_SESSIONS_CLEANUP_TASK_TYPE} Found ${nonPersistedSearchSessions.total} sessions, processing ${nonPersistedSearchSessions.saved_objects.length}`
      );

      const updatedSessions = await getAllSessionsStatusUpdates(
        deps,
        config,
        nonPersistedSearchSessions
      );
      const deletedSessionIds: string[] = [];

      await Promise.all(
        nonPersistedSearchSessions.saved_objects.map(async (session) => {
          if (isSessionStale(session, config)) {
            // delete saved object to free up memory
            // TODO: there's a potential rare edge case of deleting an object and then receiving a new trackId for that same session!
            // Maybe we want to change state to deleted and cleanup later?
            logger.debug(`Deleting stale session | ${session.id}`);
            try {
              deletedSessionIds.push(session.id);
              await savedObjectsClient.delete(SEARCH_SESSION_TYPE, session.id, {
                namespace: session.namespaces?.[0],
              });
            } catch (e) {
              logger.error(
                `${SEARCH_SESSIONS_CLEANUP_TASK_TYPE} Error while deleting session ${session.id}: ${e.message}`
              );
            }

            // Send a delete request for each async search to ES
            Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
              const searchInfo = session.attributes.idMapping[searchKey];
              if (searchInfo.status === SearchStatus.ERROR) return; // skip attempting to delete async search in case we know it has errored out

              if (searchInfo.strategy === ENHANCED_ES_SEARCH_STRATEGY) {
                try {
                  await client.asyncSearch.delete({ id: searchInfo.id });
                } catch (e) {
                  if (e.message !== 'resource_not_found_exception') {
                    logger.error(
                      `${SEARCH_SESSIONS_CLEANUP_TASK_TYPE} Error while deleting async_search ${searchInfo.id}: ${e.message}`
                    );
                  }
                }
              }
            });
          }
        })
      );

      const nonDeletedSessions = updatedSessions.filter((updateSession) => {
        return deletedSessionIds.indexOf(updateSession.id) === -1;
      });

      await bulkUpdateSessions(deps, nonDeletedSessions);

      return nonPersistedSearchSessions;
    })
  );
}

export function checkNonPersistedSessions(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema
) {
  const { logger } = deps;

  const filters = nodeBuilder.is(`${SEARCH_SESSION_TYPE}.attributes.persisted`, 'false');

  return checkSearchSessionsByPage(checkNonPersistedSessionsPage, deps, config, filters).pipe(
    catchError((e) => {
      logger.error(
        `${SEARCH_SESSIONS_CLEANUP_TASK_TYPE} Error while processing sessions: ${e?.message}`
      );
      return EMPTY;
    })
  );
}
