/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListDto } from '@kbn/workflows';

export interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tags: string[];
  label: string;
  disabled?: boolean;
  checked?: 'on' | 'off';
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  data?: {
    secondaryContent?: string;
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface WorkflowSelectionConfig {
  filterFunction?: (workflow: any) => boolean; // eslint-disable-line @typescript-eslint/no-explicit-any
  sortFunction?: (a: any, b: any) => number; // eslint-disable-line @typescript-eslint/no-explicit-any
  selectedWorkflowId?: string;
}

export interface WorkflowSelectionState {
  workflows: WorkflowOption[];
  isLoading: boolean;
  loadError: string | null;
  selectedWorkflowDisabledError: string | null;
}

export interface WorkflowSelectionActions {
  onWorkflowChange: (
    newOptions: WorkflowOption[],
    event: unknown,
    changedOption: WorkflowOption
  ) => void;
  refreshWorkflows: () => void;
}

export const useWorkflowSelection = (
  config: WorkflowSelectionConfig = {}
): WorkflowSelectionState & WorkflowSelectionActions => {
  const { filterFunction, sortFunction, selectedWorkflowId } = config;
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedWorkflowDisabledError, setSelectedWorkflowDisabledError] = useState<string | null>(
    null
  );
  const { http } = useKibana().services;

  const fetchWorkflows = useCallback(async () => {
    if (!http) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await http.post('/api/workflows/search', {
        body: JSON.stringify({
          limit: 1000,
          page: 1,
          query: '',
        }),
      });
      const workflowsMap = response as WorkflowListDto;

      // Check if the currently selected workflow is disabled
      let hasSelectedWorkflowDisabled = false;

      const workflowOptionsWithSortInfo = workflowsMap.results.map((workflow) => {
        const isDisabled = !workflow.enabled;
        const isSelected = workflow.id === selectedWorkflowId;
        const wasSelectedButNowDisabled = isSelected && isDisabled;

        // Track if selected workflow is disabled
        if (wasSelectedButNowDisabled) {
          hasSelectedWorkflowDisabled = true;
        }

        // Apply custom filter if provided
        const passesFilter = filterFunction ? filterFunction(workflow) : true;

        const workflowTags = workflow.definition?.tags || [];

        return {
          workflowOption: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            enabled: workflow.enabled,
            tags: workflowTags,
            label: workflow.name,
            disabled: isDisabled,
            checked: isSelected ? 'on' : undefined,
            data: {
              secondaryContent: workflow.description,
            },
            // Store additional data for the UI components to use
            wasSelectedButNowDisabled,
            isDisabled,
          } as WorkflowOption,
          passesFilter,
          workflow,
        };
      });

      // Apply filter
      const filteredWorkflowOptions = workflowOptionsWithSortInfo.filter(
        (item) => item.passesFilter
      );

      // Apply custom sort if provided
      const sortedWorkflowOptions = sortFunction
        ? filteredWorkflowOptions.sort((a, b) => sortFunction(a.workflow, b.workflow))
        : filteredWorkflowOptions;

      // Extract just the workflow options for the component
      const workflowOptions = sortedWorkflowOptions.map((item) => item.workflowOption);

      // Set error state if selected workflow is disabled
      if (hasSelectedWorkflowDisabled) {
        setSelectedWorkflowDisabledError(
          'The previously selected workflow is no longer available. Please select a different workflow.'
        );
      } else {
        setSelectedWorkflowDisabledError(null);
      }

      setWorkflows(workflowOptions);
    } catch (error) {
      setLoadError('Failed to load workflows. Please check your connector configuration.');
    } finally {
      setIsLoading(false);
    }
  }, [http, filterFunction, sortFunction, selectedWorkflowId]);

  const onWorkflowChange = useCallback(
    (newOptions: WorkflowOption[], event: unknown, changedOption: WorkflowOption) => {
      setWorkflows(newOptions);
      // Clear the disabled workflow error when a new workflow is selected
      setSelectedWorkflowDisabledError(null);
    },
    []
  );

  const refreshWorkflows = useCallback(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  return {
    workflows,
    isLoading,
    loadError,
    selectedWorkflowDisabledError,
    onWorkflowChange,
    refreshWorkflows,
  };
};
