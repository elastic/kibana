/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import type { WorkflowListDto } from '@kbn/workflows';
import { TagsBadge } from './tags_badge';
import { IconDisabledWorkflow } from '../../assets/icons';

export interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  tags: string[];
  label: string;
  disabled?: boolean;
  checked?: 'on' | 'off';
  namePrepend?: React.ReactNode;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  data?: {
    secondaryContent?: string;
  };
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface WorkflowSelectorConfig {
  // Filtering
  filterByTrigger?: 'alert' | 'scheduled' | 'manual';

  // Sorting
  sortByTrigger?: 'alert' | 'scheduled' | 'manual';

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
  let filteredWorkflows = [...workflows];

  // Apply filters
  if (config.filterByTrigger) {
    filteredWorkflows = filteredWorkflows.filter((workflow) => {
      const triggers = workflow.definition?.triggers ?? [];
      return triggers.some((trigger) => trigger.type === config.filterByTrigger);
    });
  }

  // Apply sorting
  if (config.sortByTrigger) {
    filteredWorkflows.sort((a, b) => {
      const aHasAlert = (a.definition?.triggers ?? []).some((t) => t.type === config.sortByTrigger);
      const bHasAlert = (b.definition?.triggers ?? []).some((t) => t.type === config.sortByTrigger);
      if (aHasAlert && !bHasAlert) return -1;
      if (!aHasAlert && bHasAlert) return 1;
      return 0;
    });
  }

  // Convert to WorkflowOption format
  return filteredWorkflows.map((workflow) => {
    const isSelected = workflow.id === selectedWorkflowId;
    const isDisabled = !workflow.enabled;
    const wasSelectedButNowDisabled = isSelected && isDisabled;

    // Determine what to show in prepend based on config
    let prependNameElement: React.ReactNode;
    if (wasSelectedButNowDisabled) {
      prependNameElement = (
        <EuiIcon type="alert" color="warning" aria-label="Workflow disabled warning" />
      );
    } else if (isDisabled) {
      prependNameElement = (
        <IconDisabledWorkflow size="m" style={{ marginRight: '8px' }} aria-label="Disabled" />
      );
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      enabled: workflow.enabled,
      tags: workflow.definition?.tags || [],
      label: workflow.name,
      disabled: isDisabled,
      checked: isSelected ? 'on' : undefined,
      namePrepend: prependNameElement,
      append: <TagsBadge tags={workflow.definition?.tags || []} />,
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
