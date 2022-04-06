/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsFindResult, SavedObjectsUpdateResponse } from 'kibana/server';
import { SearchSessionsConfigSchema } from 'src/plugins/data/config';
import {
  SearchSessionRequestInfo,
  SearchSessionSavedObjectAttributes,
  SearchSessionStatus,
} from '../../../../../../src/plugins/data/common';
import { getSearchStatus } from './get_search_status';
import { getSessionStatus } from './get_session_status';
import { CheckSearchSessionsDeps, SearchSessionsResponse, SearchStatus } from './types';
import { isSearchSessionExpired } from './utils';

export async function updateSessionStatus(
  { logger, client }: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema,
  session: SavedObjectsFindResult<SearchSessionSavedObjectAttributes>
) {
  let sessionUpdated = false;
  const isExpired = isSearchSessionExpired(session);

  if (!isExpired) {
    // Check statuses of all running searches
    await Promise.all(
      Object.keys(session.attributes.idMapping).map(async (searchKey: string) => {
        const updateSearchRequest = (
          currentStatus: Pick<SearchSessionRequestInfo, 'status' | 'error'>
        ) => {
          sessionUpdated = true;
          session.attributes.idMapping[searchKey] = {
            ...session.attributes.idMapping[searchKey],
            ...currentStatus,
          };
        };

        const searchInfo = session.attributes.idMapping[searchKey];
        if (searchInfo.status === SearchStatus.IN_PROGRESS) {
          try {
            const currentStatus = await getSearchStatus(client, searchInfo.id);

            if (currentStatus.status !== searchInfo.status) {
              logger.debug(`search ${searchInfo.id} | status changed to ${currentStatus.status}`);
              updateSearchRequest(currentStatus);
            }
          } catch (e) {
            logger.error(e);
            updateSearchRequest({
              status: SearchStatus.ERROR,
              error: e.message || e.meta.error?.caused_by?.reason,
            });
          }
        }
      })
    );
  }

  // And only then derive the session's status
  const sessionStatus = isExpired
    ? SearchSessionStatus.EXPIRED
    : getSessionStatus(session.attributes, config);
  if (sessionStatus !== session.attributes.status) {
    const now = new Date().toISOString();
    session.attributes.status = sessionStatus;
    session.attributes.touched = now;
    if (sessionStatus === SearchSessionStatus.COMPLETE) {
      session.attributes.completed = now;
    } else if (session.attributes.completed) {
      session.attributes.completed = null;
    }
    sessionUpdated = true;
  }

  return sessionUpdated;
}

export async function getAllSessionsStatusUpdates(
  deps: CheckSearchSessionsDeps,
  config: SearchSessionsConfigSchema,
  searchSessions: SearchSessionsResponse
) {
  const updatedSessions = new Array<SavedObjectsFindResult<SearchSessionSavedObjectAttributes>>();

  await Promise.all(
    searchSessions.saved_objects.map(async (session) => {
      const updated = await updateSessionStatus(deps, config, session);

      if (updated) {
        updatedSessions.push(session);
      }
    })
  );

  return updatedSessions;
}

export async function bulkUpdateSessions(
  { logger, savedObjectsClient }: CheckSearchSessionsDeps,
  updatedSessions: Array<SavedObjectsFindResult<SearchSessionSavedObjectAttributes>>
) {
  if (updatedSessions.length) {
    // If there's an error, we'll try again in the next iteration, so there's no need to check the output.
    const updatedResponse = await savedObjectsClient.bulkUpdate<SearchSessionSavedObjectAttributes>(
      updatedSessions.map((session) => ({
        ...session,
        namespace: session.namespaces?.[0],
      }))
    );

    const success: Array<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> = [];
    const fail: Array<SavedObjectsUpdateResponse<SearchSessionSavedObjectAttributes>> = [];

    updatedResponse.saved_objects.forEach((savedObjectResponse) => {
      if ('error' in savedObjectResponse) {
        fail.push(savedObjectResponse);
        logger.error(
          `Error while updating search session ${savedObjectResponse?.id}: ${savedObjectResponse.error?.message}`
        );
      } else {
        success.push(savedObjectResponse);
      }
    });

    logger.debug(`Updating search sessions: success: ${success.length}, fail: ${fail.length}`);
  }
}
