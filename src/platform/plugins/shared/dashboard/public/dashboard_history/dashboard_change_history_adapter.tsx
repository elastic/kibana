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
import { RestoreChangeResponse } from '@kbn/dashboard-plugin/server/change_history/register_restore_route';

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
      console.log({ response });
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
  getPendingChange: () => {
    if (!dashboardApi || !dashboardApi!.hasUnsavedChanges$.getValue()) return;
    return {
      id: dashboardApi!.uuid,
      actor: { name: '' },
      action: 'dashboard_unsaved_changes',
      timestamp: new Date(Date.now()).toISOString(),
      snapshot: dashboardApi!.getSerializedState().attributes,
      metadata: { unsavedChanges: true },
    };
  },
  restoreChange: dashboardApi
    ? async ({ objectId, changeId, signal }) => {
        console.log('RESTORE!!!!!!!!!!!!!!!!!!!!');
        try {
          const response = await http.get<RestoreChangeResponse>(
            `${BASE_HISTORY_PATH}/${objectId}/restore/${changeId}`,
            {
              signal,
            }
          );
          dashboardApi.setState(response, true);
        } catch (e) {
          throw mapChangeHistoryHttpError(e);
        }
      }
    : undefined,
});
