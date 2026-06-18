/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChangeHistoryAdapter, ChangeHistoryDetail } from '@kbn/change-history-ui';
import type { HttpSetup } from '@kbn/core/public';

import {
  mapWorkflowHistoryItemToDetail,
  mapWorkflowHistoryItemToListItem,
} from './map_workflow_history_item';
import {
  WORKFLOW_CHANGE_HISTORY_INTERNAL_API_VERSION,
  WORKFLOW_CHANGE_HISTORY_LIST_PATH,
} from '../../../common/lib/workflow_change_history/constants';
import type { WorkflowChangesHistoryResponse } from '../../../common/lib/workflow_change_history/types';

export const createWorkflowChangeHistoryAdapter = (http: HttpSetup): ChangeHistoryAdapter => {
  const changeCache = new Map<string, ChangeHistoryDetail>();

  return {
    listChanges: async ({ objectId, page, signal }) => {
      if (page.index === 0) {
        changeCache.clear();
      }

      const response = await http.get<WorkflowChangesHistoryResponse>(
        `${WORKFLOW_CHANGE_HISTORY_LIST_PATH}/${encodeURIComponent(objectId)}/history`,
        {
          query: {
            page: page.index + 1,
            per_page: page.size,
          },
          version: WORKFLOW_CHANGE_HISTORY_INTERNAL_API_VERSION,
          signal,
        }
      );

      const items = response.items.map((item, index) => {
        const isCurrent = page.index === 0 && index === 0;
        const listItem = mapWorkflowHistoryItemToListItem(item, { isCurrent });
        changeCache.set(item.id, mapWorkflowHistoryItemToDetail(item, { isCurrent }));
        return listItem;
      });

      return {
        items,
        total: response.total,
      };
    },

    getChange: async ({ changeId }) => {
      const cached = changeCache.get(changeId);

      if (!cached) {
        throw new Error(
          `Workflow change "${changeId}" is not loaded. Select it from the history list first.`
        );
      }

      return cached;
    },
  };
};
