/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, memo } from 'react';
import { QueryClient, QueryClientProvider, type QueryClientConfig } from '@kbn/react-query';
import { WorkflowSelector } from './workflow_selector';
import type { WorkflowSelectorConfig } from './workflow_utils';

interface WorkflowSelectorWithProviderProps {
  selectedWorkflowId?: string;
  onWorkflowChange: (workflowId: string) => void;
  config?: WorkflowSelectorConfig;
  error?: string;
  onCreateWorkflow?: () => void;
  // Optional: provide your own QueryClient for shared cache/configuration
  queryClient?: QueryClient;
  // Optional: configure the QueryClient if you don't provide one
  queryClientConfig?: QueryClientConfig;
}

const WorkflowSelectorWithProvider = memo<WorkflowSelectorWithProviderProps>(
  ({ queryClient: providedQueryClient, queryClientConfig, ...selectorProps }) => {
    // Use provided client, or create one per instance (for isolation)
    const queryClient = useMemo(() => {
      if (providedQueryClient) {
        return providedQueryClient;
      }
      return new QueryClient(
        queryClientConfig || {
          defaultOptions: {
            queries: {
              retry: false,
              refetchOnWindowFocus: false,
            },
          },
        }
      );
    }, [providedQueryClient, queryClientConfig]);

    return (
      <QueryClientProvider client={queryClient}>
        <WorkflowSelector {...selectorProps} />
      </QueryClientProvider>
    );
  }
);

WorkflowSelectorWithProvider.displayName = 'WorkflowSelectorWithProvider';

export { WorkflowSelectorWithProvider };
