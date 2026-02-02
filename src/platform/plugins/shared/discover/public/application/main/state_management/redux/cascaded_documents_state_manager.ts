/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CascadedDocumentsStateManager } from '../../data_fetching/cascaded_documents_fetcher';
import type { InternalStateStore } from './internal_state';
import { internalStateSlice } from './internal_state';
import { selectTab } from './selectors';

export const createCascadedDocumentsStateManager = ({
  internalState,
  tabId,
}: {
  internalState: InternalStateStore;
  tabId: string;
}): CascadedDocumentsStateManager => ({
  getIsActiveInstance() {
    return internalState.getState().tabs.unsafeCurrentId === tabId;
  },
  getCascadedDocuments(nodeId) {
    const currentTab = selectTab(internalState.getState(), tabId);
    return currentTab.cascadedDocumentsState.cascadedDocumentsMap[nodeId];
  },
  setCascadedDocuments(nodeId, records) {
    const currentTab = selectTab(internalState.getState(), tabId);
    const cascadedDocumentsState = currentTab.cascadedDocumentsState;
    internalState.dispatch(
      internalStateSlice.actions.setCascadedDocumentsState({
        tabId,
        cascadedDocumentsState: {
          ...cascadedDocumentsState,
          cascadedDocumentsMap: {
            ...cascadedDocumentsState.cascadedDocumentsMap,
            [nodeId]: records,
          },
        },
      })
    );
  },
});
