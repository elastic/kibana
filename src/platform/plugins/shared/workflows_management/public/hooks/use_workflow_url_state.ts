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

export type WorkflowUrlStateTabType = 'workflow' | 'executions';

export interface WorkflowUrlState {
  tab?: WorkflowUrlStateTabType;
  executionId?: string;
  stepExecutionId?: string;
  stepId?: string;
}

export function useWorkflowUrlState() {
  const history = useHistory();
  const location = useLocation();

  const urlState = useMemo(() => {
    const params = parse(location.search);
    return {
      tab: (params.tab as WorkflowUrlStateTabType) || 'workflow',
      executionId: params.executionId as string | undefined,
      stepExecutionId: params.stepExecutionId as string | undefined,
      stepId: params.stepId as string | undefined,
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
      // When switching to other tab, clear execution selection
      updateUrlState({
        executionId: undefined,
        stepExecutionId: undefined,
        stepId: undefined,
        tab,
      });
    },
    [updateUrlState]
  );

  const setSelectedExecution = useCallback(
    (executionId: string | null) => {
      updateUrlState({
        executionId: executionId || undefined,
        stepExecutionId: undefined,
        stepId: undefined,
      });
    },
    [updateUrlState]
  );

  const setSelectedStepExecution = useCallback(
    (stepExecutionId: string | null) => {
      updateUrlState({
        stepExecutionId: stepExecutionId || undefined,
        stepId: undefined,
      });
    },
    [updateUrlState]
  );

  const setSelectedStep = useCallback(
    (stepId: string | null) => {
      updateUrlState({
        stepId: stepId || undefined,
      });
    },
    [updateUrlState]
  );

  return {
    // Current state
    activeTab: urlState.tab,
    selectedExecutionId: urlState.executionId,
    selectedStepExecutionId: urlState.stepExecutionId,
    selectedStepId: urlState.stepId,

    // State setters
    setActiveTab,
    setSelectedExecution,
    setSelectedStepExecution,
    setSelectedStep,
    updateUrlState,
  };
}
