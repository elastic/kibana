/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MAX_RETRIES, useTemplate } from './use_template';
import { createMockWorkflowApi } from '../../api/workflows_api.mock';
import { testQueryClientConfig } from '../../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('../../api/use_workflows_api', () => ({
  useWorkflowsApi: () => mockWorkflowApi,
}));

// Zero delay so the hook's own retry policy runs without real backoff.
const queryClient = new QueryClient({
  ...testQueryClientConfig,
  defaultOptions: {
    queries: { ...testQueryClientConfig.defaultOptions?.queries, retryDelay: 0 },
  },
});

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const createHttpFetchError = (status: number): Error =>
  Object.assign(new Error(`Request failed with status ${status}`), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
  });

describe('useTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('does not retry when the template is not found', async () => {
    mockWorkflowApi.getTemplate.mockRejectedValue(createHttpFetchError(404));

    const { result } = renderHook(() => useTemplate('no-such-template'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockWorkflowApi.getTemplate).toHaveBeenCalledTimes(1);
  });

  it('retries other errors before failing', async () => {
    mockWorkflowApi.getTemplate.mockRejectedValue(createHttpFetchError(500));

    const { result } = renderHook(() => useTemplate('ip-reputation-check'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // The initial attempt plus each retry.
    expect(mockWorkflowApi.getTemplate).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });
});
