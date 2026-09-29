/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { RunWorkflowResponseDto } from '@kbn/workflows';
import { useRunWorkflow } from '../..';
import { createMockWorkflowApi } from '../api/workflows_api.mock';
import { testQueryClientConfig } from '../test_utils';

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const mockWorkflowApi = createMockWorkflowApi();
vi.mock('../api/use_workflows_api', () => {
      const mocked = {
      useWorkflowsApi: () => mockWorkflowApi,
    };
      return { ...mocked, default: mocked };
    });
const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useRunWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('runs workflow via API', async () => {
    const response = { workflowExecutionId: 'execution-1' } as RunWorkflowResponseDto;
    mockWorkflowApi.runWorkflow.mockResolvedValue(response);

    const { result } = renderHook(() => useRunWorkflow(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'workflow-1',
        inputs: { event: { triggerType: 'manual' } },
      });
    });

    expect(mockWorkflowApi.runWorkflow).toHaveBeenCalledWith('workflow-1', {
      inputs: { event: { triggerType: 'manual' } },
    });
  });

  it('throws when http service is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockWorkflowApi.runWorkflow.mockRejectedValue(new Error('HTTP service unavailable'));

    const { result } = renderHook(() => useRunWorkflow(), { wrapper });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 'workflow-1',
          inputs: {},
        });
      } catch (error) {
        thrownError = error as Error;
      }
    });

    expect(thrownError?.message).toMatch(/HTTP service unavailable/);
  });
});
