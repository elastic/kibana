/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ChangeHistoryAdapter,
  ChangeHistoryDetail,
  ChangeHistoryListItem,
  ChangeHistoryListItemChanges,
  ChangeHistoryPendingChange,
} from '@kbn/change-history-ui';
import { mapChangeHistoryHttpError } from '@kbn/change-history-ui';
import type { HttpSetup } from '@kbn/core/public';
import { WorkflowApi } from '@kbn/workflows-ui';

import { computeWorkflowYamlChanges } from './compute_workflow_yaml_changes';
import {
  mapWorkflowHistoryItemToDetail,
  mapWorkflowHistoryItemToListItem,
} from './map_workflow_history_item';
import { INTERNAL_API_VERSION } from '../../../common/lib/api_constants';
import { WORKFLOW_CHANGE_HISTORY_LIST_PATH } from '../../../common/lib/workflow_change_history/constants';
import type {
  WorkflowChangesHistoryResponse,
  WorkflowHistoryItem,
} from '../../../common/lib/workflow_change_history/types';

const toCacheKey = (objectId: string, changeId: string): string => `${objectId}:${changeId}`;

const toPageTailKey = (objectId: string, pageIndex: number): string => `${objectId}:${pageIndex}`;

const clearObjectCache = (
  changeCache: Map<string, ChangeHistoryDetail>,
  objectId: string
): void => {
  const prefix = `${objectId}:`;

  for (const key of changeCache.keys()) {
    if (key.startsWith(prefix)) {
      changeCache.delete(key);
    }
  }
};

const clearPageTails = (
  pageTailByKey: Map<string, WorkflowHistoryItem>,
  objectId: string
): void => {
  const prefix = `${objectId}:`;

  for (const key of pageTailByKey.keys()) {
    if (key.startsWith(prefix)) {
      pageTailByKey.delete(key);
    }
  }
};

const toListChanges = (
  baselineYaml: string,
  targetYaml: string
): ChangeHistoryListItemChanges | undefined => {
  const computedChanges = computeWorkflowYamlChanges(baselineYaml, targetYaml);
  if (computedChanges.count === 0) {
    return undefined;
  }

  return {
    count: computedChanges.count,
    ...(computedChanges.summaryGroups?.length ? { summary: computedChanges.summaryGroups } : {}),
  };
};

const yieldToNextFrame = (signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      return;
    }

    const onAbort = (): void => {
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
      }
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };

    const rafId = requestAnimationFrame(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    });

    signal?.addEventListener('abort', onAbort, { once: true });
  });

export interface CreateWorkflowChangeHistoryAdapterOptions {
  onWorkflowRestored?: (objectId: string) => Promise<void>;
  getPendingChange?: () => ChangeHistoryPendingChange | undefined;
}

export const createWorkflowChangeHistoryAdapter = (
  http: HttpSetup,
  { onWorkflowRestored, getPendingChange }: CreateWorkflowChangeHistoryAdapterOptions = {}
): ChangeHistoryAdapter => {
  const changeCache = new Map<string, ChangeHistoryDetail>();
  const pageTailByKey = new Map<string, WorkflowHistoryItem>();
  const workflowApi = new WorkflowApi(http);

  return {
    listChanges: async ({ objectId, page, signal }) => {
      if (page.index === 0) {
        clearObjectCache(changeCache, objectId);
        clearPageTails(pageTailByKey, objectId);
      }

      const response = await http.get<WorkflowChangesHistoryResponse>(
        `${WORKFLOW_CHANGE_HISTORY_LIST_PATH}/${encodeURIComponent(objectId)}/history`,
        {
          query: {
            page: page.index + 1,
            per_page: page.size,
          },
          version: INTERNAL_API_VERSION,
          signal,
        }
      );

      signal?.throwIfAborted();

      const items: ChangeHistoryListItem[] = [];

      for (let index = 0; index < response.items.length; index += 1) {
        if (index > 0) {
          await yieldToNextFrame(signal);
        }

        const item = response.items[index];
        const isCurrent = page.index === 0 && index === 0;
        const previousVersion = response.items[index + 1];
        const changes = previousVersion
          ? toListChanges(previousVersion.workflow.yaml, item.workflow.yaml)
          : undefined;
        const listItem = mapWorkflowHistoryItemToListItem(item, { isCurrent, changes });
        changeCache.set(
          toCacheKey(objectId, item.id),
          mapWorkflowHistoryItemToDetail(item, { isCurrent, changes })
        );
        items.push(listItem);
      }

      const pageTail = response.items[response.items.length - 1];
      if (pageTail) {
        pageTailByKey.set(toPageTailKey(objectId, page.index), pageTail);
      }

      let updatedItems: ChangeHistoryListItem[] | undefined;
      if (page.index > 0 && response.items.length > 0) {
        const previousPageTail = pageTailByKey.get(toPageTailKey(objectId, page.index - 1));
        const currentPageHead = response.items[0];

        if (previousPageTail && currentPageHead) {
          await yieldToNextFrame(signal);
          const changes = toListChanges(
            currentPageHead.workflow.yaml,
            previousPageTail.workflow.yaml
          );
          const patchedListItem = mapWorkflowHistoryItemToListItem(previousPageTail, { changes });
          updatedItems = [patchedListItem];
          changeCache.set(
            toCacheKey(objectId, previousPageTail.id),
            mapWorkflowHistoryItemToDetail(previousPageTail, { changes })
          );
        }
      }

      return {
        items,
        total: response.total,
        ...(updatedItems ? { updatedItems } : {}),
      };
    },

    getChange: async ({ objectId, changeId, signal }) => {
      signal?.throwIfAborted();

      const cached = changeCache.get(toCacheKey(objectId, changeId));

      if (!cached) {
        throw new Error(
          `Workflow change "${changeId}" is not loaded. Select it from the history list first.`
        );
      }

      return cached;
    },

    restoreChange: async ({ objectId, changeId, signal }) => {
      try {
        await workflowApi.restoreWorkflowVersion(objectId, changeId, { signal });
        await onWorkflowRestored?.(objectId);
      } catch (error) {
        throw mapChangeHistoryHttpError(error);
      }
    },
    ...(getPendingChange ? { getPendingChange } : {}),
  };
};
