/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ElasticsearchClient,
  SavedObject,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { SearchSessionRequestInfo } from '../../../../common';
import { SEARCH_SESSION_TYPE, type SearchSessionSavedObjectAttributes } from '../../../../common';
import { getSessionStatus } from './get_session_status';
import type { SessionStatus } from '../types';

export async function updateSessionStatus(
  deps: { esClient: ElasticsearchClient; savedObjectsClient: SavedObjectsClientContract },
  session: SavedObject<SearchSessionSavedObjectAttributes>
): Promise<SessionStatus> {
  const sessionStatus = await getSessionStatus(deps, session.attributes);
  const updatedIdMapping = getUpdatedIdMappings(
    session.attributes,
    sessionStatus.searchStatuses || []
  );

  const needsUpdate = !!updatedIdMapping || session.attributes.status !== sessionStatus.status;
  if (!needsUpdate) return sessionStatus;

  const updatedSession: SavedObject<SearchSessionSavedObjectAttributes> = {
    ...session,
    attributes: {
      ...session.attributes,
      status: sessionStatus.status,
      idMapping: updatedIdMapping || session.attributes.idMapping,
    },
  };
  await deps.savedObjectsClient.update<SearchSessionSavedObjectAttributes>(
    SEARCH_SESSION_TYPE,
    session.id,
    updatedSession.attributes
  );

  return sessionStatus;
}

function getUpdatedIdMappings(
  session: SearchSessionSavedObjectAttributes,
  searchStatuses: SearchSessionRequestInfo[]
) {
  let hasUpdated = false;
  const idMapping = { ...session.idMapping };

  for (const searchStatus of searchStatuses) {
    const requestHash = getRequestHashBySearchId(session, searchStatus.id);
    if (!requestHash) continue;

    const search = idMapping[requestHash];
    if (!search || search.status === searchStatus.status) continue;
    idMapping[requestHash] = {
      ...search,
      status: searchStatus.status,
      completedAt: searchStatus.completedAt,
      startedAt: searchStatus.startedAt,
      error: searchStatus.error,
    };
    hasUpdated = true;
  }

  return hasUpdated ? idMapping : null;
}

function getRequestHashBySearchId(session: SearchSessionSavedObjectAttributes, searchId: string) {
  for (const [requestHash, info] of Object.entries(session.idMapping)) {
    if (info.id === searchId) return requestHash;
  }

  return null;
}
