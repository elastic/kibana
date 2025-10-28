/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License v 1".
 */

import type React from 'react';

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
  [key: string]: any;
}

export interface WorkflowSelectorProps {
  workflows: WorkflowOption[];
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  label?: string;
  error?: string;
  helpText?: string;
  isInvalid?: boolean;
  isLoading?: boolean;
  loadError?: string;
  emptyStateComponent?: React.ComponentType<{ onCreateWorkflow: () => void }>;
  onCreateWorkflow?: () => void;
  placeholder?: string;
  'data-test-subj'?: string;
  sortWorkflows?: (a: WorkflowOption, b: WorkflowOption) => number;
}
