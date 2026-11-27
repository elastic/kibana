/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapChangeHistoryHttpError, type ChangeHistoryAdapter } from '@kbn/change-history-ui';
import { buildPath, type HttpSetup } from '@kbn/core-http-browser';
import type {
  DiscoverSessionHistoryDetailsResponse,
  DiscoverSessionHistoryListResponse,
} from '../../server/change_history/register_routes';
import {
  DISCOVER_SESSION_CHANGE_HISTORY_API_VERSION,
  DISCOVER_SESSION_INTERNAL_API_BASE_PATH,
} from '../../common/constants';

const HISTORY_PATH = `${DISCOVER_SESSION_INTERNAL_API_BASE_PATH}/{objectId}/history`;
const version = DISCOVER_SESSION_CHANGE_HISTORY_API_VERSION;

export const createDiscoverChangeHistoryAdapter = ({
  http,
  canRestore,
  onRestored,
}: {
  http: HttpSetup;
  canRestore: boolean;
  /** Called once the session was restored on the server, so the app can reload it. */
  onRestored: () => void;
}): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    try {
      return await http.get<DiscoverSessionHistoryListResponse>(
        buildPath(HISTORY_PATH, { objectId }),
        { query: { page: page.index + 1, per_page: page.size }, version, signal }
      );
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },
  getChange: async ({ objectId, changeId, signal }) => {
    try {
      return await http.get<DiscoverSessionHistoryDetailsResponse>(
        buildPath(`${HISTORY_PATH}/{changeId}`, { objectId, changeId }),
        { version, signal }
      );
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },
  restoreChange: canRestore
    ? async ({ objectId, changeId, signal }) => {
        try {
          await http.post(
            buildPath(`${HISTORY_PATH}/{changeId}/_restore`, { objectId, changeId }),
            {
              version,
              signal,
            }
          );
        } catch (error) {
          throw mapChangeHistoryHttpError(error);
        }
        onRestored();
      }
    : undefined,
});
