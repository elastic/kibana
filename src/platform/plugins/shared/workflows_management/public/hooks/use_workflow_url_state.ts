/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { parse, stringify } from 'query-string';

export interface WorkflowUrlState {
  tab?: 'workflow' | 'executions';
  executionId?: string;
}

export function useWorkflowUrlState() {
  const history = useHistory();
  const location = useLocation();

  const urlState = useMemo(() => {
    const params = parse(location.search);
    return {
      tab: (params.tab as 'workflow' | 'executions') || 'workflow',
      executionId: params.executionId as string | undefined,
    };
  }, [location.search]);

  const updateUrlState = useCallback(
    (updates: Partial<WorkflowUrlState>) => {
      const currentParams = parse(location.search);

      // Update the params with new values
      const newParams = {
        ...currentParams,
        ...updates,
      };

      // Remove undefined values to keep URL clean
      const cleanParams: Record<string, any> = {};
      Object.entries(newParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          cleanParams[key] = value;
        }
      });

      // Update the URL without causing a full page reload
      const newSearch = stringify(cleanParams, { encode: false });
      const newLocation = {
        ...location,
        search: newSearch ? `?${newSearch}` : '',
      };

      history.replace(newLocation);
    },
    [history, location]
  );

  const setActiveTab = useCallback(
    (tab: 'workflow' | 'executions') => {
      // When switching to workflow tab, clear execution selection
      const updates: Partial<WorkflowUrlState> = { tab };
      if (tab === 'workflow') {
        updates.executionId = undefined;
      }
      updateUrlState(updates);
    },
    [updateUrlState]
  );

  const setSelectedExecution = useCallback(
    (executionId: string | null) => {
      updateUrlState({
        tab: 'executions', // Automatically switch to executions tab
        executionId: executionId || undefined,
      });
    },
    [updateUrlState]
  );

  return {
    // Current state
    activeTab: urlState.tab,
    selectedExecutionId: urlState.executionId,

    // State setters
    setActiveTab,
    setSelectedExecution,
    updateUrlState,
  };
}
