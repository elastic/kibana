/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mapChangeHistoryHttpError, type ChangeHistoryAdapter } from '@kbn/change-history-ui';
import type { HttpSetup } from '@kbn/core-http-browser';
import type { ChangeDetailsResponse } from '../../server/change_history/register_details_route';
import type { HistoryListResponse } from '../../server/change_history/register_list_route';

const BASE_HISTORY_PATH = `/internal/dashboard/change_history` as const;

export const createDashboardChangeHistoryAdapter = (http: HttpSetup): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    try {
      const response = await http.get<HistoryListResponse>(`${BASE_HISTORY_PATH}/${objectId}`, {
        query: { page: page.index + 1, per_page: page.size },
        signal,
      });
      return response;
    } catch (e) {
      throw mapChangeHistoryHttpError(e);
    }
  },
  getChange: async ({ objectId, changeId, signal }) => {
    try {
      const response = await http.get<ChangeDetailsResponse>(
        `${BASE_HISTORY_PATH}/${objectId}/${changeId}`,
        {
          signal,
        }
      );
      return response;
    } catch (e) {
      throw mapChangeHistoryHttpError(e);
    }
  },
  restoreChange: async ({ objectId, changeId, signal }) => {
    // try {
    //   await http.post(/* restore route */, { signal });
    // } catch (error) {
    //   throw mapChangeHistoryHttpError(error);
    // }
  },
});
