/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo } from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { WorkflowSelector } from './workflow_selector';
import type { WorkflowSelectorConfig } from './workflow_utils';

interface WorkflowSelectorWithProviderProps {
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  config?: WorkflowSelectorConfig;
  error?: string;
}

const WorkflowSelectorWithProvider = memo<WorkflowSelectorWithProviderProps>(
  ({ ...selectorProps }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    return (
      <QueryClientProvider client={queryClient}>
        <WorkflowSelector {...selectorProps} />
      </QueryClientProvider>
    );
  }
);

WorkflowSelectorWithProvider.displayName = 'WorkflowSelectorWithProvider';

export { WorkflowSelectorWithProvider };
