/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { createMockWorkflowApi, type MockWorkflowApi } from '@kbn/workflows-ui/mocks';
import { useWorkflowExecutionsSearch } from './use_workflow_executions_search';
import { createQueryClientWrapper, createTestQueryClient } from '../../shared/test_utils';

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: jest.fn(),
}));

const mockUseWorkflowsApi = useWorkflowsApi as jest.MockedFunction<typeof useWorkflowsApi>;

const phraseFilter = (key: string, query: string, negate = false): Filter => ({
  meta: { type: 'phrase', key, negate, disabled: false, params: { query } },
});

describe('useWorkflowExecutionsSearch', () => {
  let mockWorkflowApi: MockWorkflowApi;

  const renderSearchHook = async (filters: Filter[]) => {
    const queryClient = createTestQueryClient();
    const { result } = renderHook(
      () =>
        useWorkflowExecutionsSearch({
          query: { query: '', language: 'kuery' },
          filters,
          timeRange: { from: 'now-15m', to: 'now' },
          spaceId: 'default',
          pageIndex: 0,
          pageSize: 25,
          sort: [['startedAt', 'desc']],
        }),
      { wrapper: createQueryClientWrapper(queryClient) }
    );
    await waitFor(() => expect(mockWorkflowApi.searchExecutions).toHaveBeenCalled());
    await waitFor(() => expect(result.current.isFetching).toBe(false));
    return mockWorkflowApi.searchExecutions.mock.calls[0][0];
  };

  beforeEach(() => {
    mockWorkflowApi = createMockWorkflowApi();
    mockWorkflowApi.searchExecutions.mockResolvedValue({
      results: [],
      page: 1,
      size: 25,
      total: 0,
    });
    mockUseWorkflowsApi.mockReturnValue(mockWorkflowApi);
  });

  it('sends a phrase filter on a non-structured field as KQL', async () => {
    const params = await renderSearchHook([phraseFilter('workflowId', 'abc')]);

    expect(params?.kql).toBe('(workflowId: abc)');
  });

  it('sends a negated phrase filter on a non-structured field as NOT KQL', async () => {
    const params = await renderSearchHook([phraseFilter('workflowId', 'abc', true)]);

    expect(params?.kql).toBe('(NOT workflowId: abc)');
  });

  it('sends a status phrase filter as the structured statuses param', async () => {
    const params = await renderSearchHook([phraseFilter('status', 'failed')]);

    expect(params?.statuses).toEqual(['failed']);
    expect(params?.kql).toBeUndefined();
  });

  it('sends a negated status filter as NOT KQL and not as structured statuses', async () => {
    const params = await renderSearchHook([phraseFilter('status', 'failed', true)]);

    expect(params?.statuses).toBeUndefined();
    expect(params?.kql).toBe('(NOT status: failed)');
  });

  it('sends a negated executedBy filter as NOT KQL and not as structured executedBy', async () => {
    const params = await renderSearchHook([phraseFilter('executedBy', 'elastic', true)]);

    expect(params?.executedBy).toBeUndefined();
    expect(params?.kql).toBe('(NOT executedBy: elastic)');
  });
});
