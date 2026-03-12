/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  createKbnUrlStateStorage,
  createStateContainer,
  syncState,
  withNotifyOnErrors,
} from '@kbn/kibana-utils-plugin/public';

export interface WorkflowUrlStateAdvanced {
  tab: 'workflow' | 'executions';
  executionId?: string;
  executionFilters?: {
    status?: string;
    dateRange?: { from: string; to: string };
  };
}

const defaultState: WorkflowUrlStateAdvanced = {
  tab: 'workflow',
};

/**
 * Advanced URL state management using Kibana's KbnUrlStateStorage
 * This approach is better for complex state with nested objects, arrays, or when you need:
 * - State hashing to avoid long URLs
 * - Better serialization (Rison encoding)
 * - Integration with Kibana's global state management
 */
export function useWorkflowUrlStateAdvanced() {
  const history = useHistory();
  const { notifications, uiSettings } = useKibana().services;

  // Create URL state storage with Kibana's utilities
  const [urlStateStorage] = useState(() =>
    createKbnUrlStateStorage({
      useHash: Boolean(uiSettings?.get('state:storeInSessionStorage')),
      history,
      ...(notifications?.toasts ? withNotifyOnErrors(notifications.toasts) : {}),
    })
  );

  // Create state container
  const [stateContainer] = useState(() =>
    createStateContainer<WorkflowUrlStateAdvanced>(
      // Get initial state from URL or use default
      urlStateStorage.get<WorkflowUrlStateAdvanced>('_w') || defaultState
    )
  );

  // Set up sync between state container and URL
  useEffect(() => {
    const { start, stop } = syncState({
      storageKey: '_w', // URL key for workflow state
      stateContainer: {
        ...stateContainer,
        set: (state: WorkflowUrlStateAdvanced | null) => {
          if (state) {
            stateContainer.set(state);
          }
        },
      },
      stateStorage: urlStateStorage,
    });

    start();
    return stop;
  }, [stateContainer, urlStateStorage]);

  // Get current state
  const state = stateContainer.get();

  // Helper functions to update specific parts of state
  const setActiveTab = useCallback(
    (tab: 'workflow' | 'executions') => {
      const updates: Partial<WorkflowUrlStateAdvanced> = { tab };

      // When switching to workflow tab, clear execution-specific state
      if (tab === 'workflow') {
        updates.executionId = undefined;
        updates.executionFilters = undefined;
      }

      stateContainer.set({
        ...state,
        ...updates,
      });
    },
    [state, stateContainer]
  );

  const setSelectedExecution = useCallback(
    (executionId: string | null) => {
      stateContainer.set({
        ...state,
        tab: 'executions', // Automatically switch to executions tab
        executionId: executionId || undefined,
      });
    },
    [state, stateContainer]
  );

  const setExecutionFilters = useCallback(
    (filters: WorkflowUrlStateAdvanced['executionFilters']) => {
      stateContainer.set({
        ...state,
        executionFilters: filters,
      });
    },
    [state, stateContainer]
  );

  const updateState = useCallback(
    (updates: Partial<WorkflowUrlStateAdvanced>) => {
      stateContainer.set({
        ...state,
        ...updates,
      });
    },
    [state, stateContainer]
  );

  return {
    // Current state
    activeTab: state.tab,
    selectedExecutionId: state.executionId,
    executionFilters: state.executionFilters,

    // State setters
    setActiveTab,
    setSelectedExecution,
    setExecutionFilters,
    updateState,

    // Full state for advanced usage
    state,
    stateContainer,
  };
}
