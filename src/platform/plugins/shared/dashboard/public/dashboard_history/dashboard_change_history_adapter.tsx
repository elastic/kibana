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
import type { ChangeDetailsResponse } from '../../server/change_history/register_details_route';
import type { HistoryListResponse } from '../../server/change_history/register_list_route';
import type { RestoreChangeResponse } from '../../server/change_history/register_restore_route';
import { DASHBOARD_UNSAVED_CHANGES_ACTION } from '../../common/constants';
import type { DashboardApi } from '../dashboard_api/types';
import { dashboardClient } from '../dashboard_client';

const BASE_HISTORY_PATH = `/internal/dashboard/change_history` as const;

export const createDashboardChangeHistoryAdapter = (
  http: HttpSetup,
  dashboardApi: DashboardApi | undefined
): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    try {
      const response = await http.get<HistoryListResponse>(
        buildPath(`${BASE_HISTORY_PATH}/{objectId}`, { objectId }),
        {
          query: { page: page.index + 1, per_page: page.size },
          signal,
        }
      );
      const test = response.items.map((item) => {
        console.log({ item });
        return item.changes
          ? { ...item, changes: { ...item.changes, summary: 'This is a summary' } }
          : item;
      });
      console.log({ test });
      return { ...response, items: test };
    } catch (e) {
      throw mapChangeHistoryHttpError(e);
    }
  },
  getChange: async ({ objectId, changeId, signal }) => {
    try {
      const response = await http.get<ChangeDetailsResponse>(
        buildPath(`${BASE_HISTORY_PATH}/{objectId}/{changeId}`, { objectId, changeId }),
        {
          signal,
        }
      );
      return response;
    } catch (e) {
      throw mapChangeHistoryHttpError(e);
    }
  },
  restoreChange: dashboardApi
    ? async ({ objectId, changeId, signal }) => {
        try {
          const response = await http.post<RestoreChangeResponse>(
            buildPath(`${BASE_HISTORY_PATH}/{objectId}/{changeId}/_restore`, {
              objectId,
              changeId,
            }),
            {
              signal,
            }
          );
          // the restore route bypasses dashboardClient.update(), so evict the stale cached read
          await dashboardClient.invalidateCache(objectId);
          await dashboardApi.setState(response);
          await dashboardApi.runQuickSave({ restored: true });
        } catch (e) {
          throw mapChangeHistoryHttpError(e);
        }
      }
    : undefined,
  getPendingChange: dashboardApi
    ? () => {
        return dashboardApi.hasUnsavedChanges$.getValue()
          ? {
              id: dashboardApi.uuid,
              actor: { name: dashboardApi.user?.name ?? '' },
              action: DASHBOARD_UNSAVED_CHANGES_ACTION,
              timestamp: new Date(Date.now()).toISOString(),
              snapshot: dashboardApi.getSerializedState().attributes,
            }
          : undefined;
      }
    : undefined,
});
