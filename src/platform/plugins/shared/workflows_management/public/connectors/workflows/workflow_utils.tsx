/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { WorkflowListDto } from '@kbn/workflows';
import { TagsBadge } from './tags_badge';

export interface WorkflowValidationResult {
  severity: 'error' | 'warning' | 'info';
  message: string;
}
export interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  tags: string[];
  label: string;
  disabled?: boolean;
  checked?: 'on' | 'off';
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  validationResult?: WorkflowValidationResult | null;
  data?: {
    secondaryContent?: string;
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface WorkflowSelectorConfig {
  // Filtering
  filterFunction?: (workflows: WorkflowListDto['results']) => WorkflowListDto['results'];

  // Sorting
  sortFunction?: (workflows: WorkflowListDto['results']) => WorkflowListDto['results'];

  // Validation - runs over each workflow, returns validation result or null
  validationFunction?: (
    workflow: WorkflowListDto['results'][number]
  ) => WorkflowValidationResult | null;

  // UI Configuration
  label?: string;
  placeholder?: string;
  createWorkflowLinkText?: string;

  // Error Messages
  errorMessages?: {
    selectedWorkflowDisabled?: string;
    loadFailed?: string;
  };
}

export function processWorkflowsToOptions(
  workflows: WorkflowListDto['results'] = [],
  selectedWorkflowId?: string,
  config: WorkflowSelectorConfig = {}
): WorkflowOption[] {
  let processedWorkflows = [...workflows];

  if (config.filterFunction) {
    processedWorkflows = config.filterFunction(processedWorkflows);
  }
  if (config.sortFunction) {
    processedWorkflows = config.sortFunction(processedWorkflows);
  }

  // Convert to WorkflowOption format
  return processedWorkflows.map((workflow) => {
    const validationResult = config.validationFunction ? config.validationFunction(workflow) : null;
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      tags: workflow.definition?.tags || [],
      label: workflow.name,
      disabled: !workflow.enabled,
      checked: workflow.id === selectedWorkflowId ? 'on' : undefined,
      append: <TagsBadge tags={workflow.definition?.tags || []} />,
      validationResult,
      data: {
        secondaryContent: workflow.description || 'No description',
      },
    } as WorkflowOption;
  });
}

export function getSelectedWorkflowDisabledError(
  workflows: WorkflowListDto['results'] = [],
  selectedWorkflowId?: string,
  errorMessage?: string
): string | null {
  if (!selectedWorkflowId) return null;

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);
  return selectedWorkflow && !selectedWorkflow.enabled
    ? errorMessage || 'Selected workflow is disabled'
    : null;
}
