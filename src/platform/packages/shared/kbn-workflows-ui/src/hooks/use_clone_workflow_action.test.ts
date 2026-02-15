/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { useCloneWorkflowAction } from './use_clone_workflow_action';
import { testQueryClientConfig } from '../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const queryClient = new QueryClient(testQueryClientConfig);
const mockCore = coreMock.createStart();
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

describe('useCloneWorkflowAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    mockUseKibana.mockReturnValue({
      services: {
        http: mockCore.http,
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('clones workflow via API', async () => {
    const response = { id: 'cloned-workflow-1' } as WorkflowDetailDto;
    mockCore.http.post.mockResolvedValue(response);

    const { result } = renderHook(() => useCloneWorkflowAction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'workflow-1',
      });
    });

    expect(mockCore.http.post).toHaveBeenCalledWith('/api/workflows/workflow-1/clone');
  });

  it('throws when http service is unavailable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUseKibana.mockReturnValue({
      services: {
        http: null,
      },
    } as unknown as ReturnType<typeof useKibana>);

    const { result } = renderHook(() => useCloneWorkflowAction(), { wrapper });

    let thrownError: Error | undefined;
    await act(async () => {
      try {
        await result.current.mutateAsync({
          id: 'workflow-1',
        });
      } catch (error) {
        thrownError = error as Error;
      }
    });

    expect(thrownError?.message).toBe('Http service is not available');
  });
});
