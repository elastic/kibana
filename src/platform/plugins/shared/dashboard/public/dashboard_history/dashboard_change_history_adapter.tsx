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
import type { DashboardApi } from '../dashboard_api/types';
import { dashboardClient } from '../dashboard_client';

const BASE_HISTORY_PATH = `/internal/dashboard/change_history` as const;

export const createDashboardChangeHistoryAdapter = (
  http: HttpSetup,
  dashboardApi: DashboardApi | undefined
): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    try {
      const response = await http.get<HistoryListResponse>(`${BASE_HISTORY_PATH}/${objectId}`, {
        query: { page: page.index + 1, per_page: page.size },
        signal,
      });
      if (dashboardApi && dashboardApi.hasUnsavedChanges$.getValue()) {
        response.items[0] = {
          ...response.items[0],
          metadata: { unsavedChanges: true },
        };
      }
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
      if (response.isCurrent && dashboardApi && dashboardApi.hasUnsavedChanges$.getValue()) {
        response.snapshot = dashboardApi.getSerializedState().attributes;
      }
      return response;
    } catch (e) {
      throw mapChangeHistoryHttpError(e);
    }
  },
  restoreChange: dashboardApi
    ? async ({ objectId, changeId, signal }) => {
        try {
          const response = await http.get<ChangeDetailsResponse>(
            `${BASE_HISTORY_PATH}/${objectId}/${changeId}`,
            {
              signal,
            }
          );
          console.log({ response });
          dashboardApi.setState(response.snapshot);
          dashboardApi.runQuickSave();
          // const result = await dashboardClient.update(objectId, response.snapshot);
          // dashboardApi.onSave$.next({
          //   objectId,
          //   dashboardId: result?.id ?? objectId,
          //   dashboardState: response.snapshot,
          // });

          // console.log({ result });
        } catch (e) {
          throw mapChangeHistoryHttpError(e);
        }
      }
    : undefined,
});
