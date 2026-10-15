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
import type { Template } from '@kbn/workflows-library';
import { useCatalog } from './use_catalog';
import { createMockWorkflowApi } from '../../api/workflows_api.mock';
import { testQueryClientConfig } from '../../test_utils';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const mockWorkflowApi = createMockWorkflowApi();
jest.mock('../../api/use_workflows_api', () => ({
  useWorkflowsApi: () => mockWorkflowApi,
}));

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const buildTemplate = (overrides: Partial<Template> = {}): Template => ({
  slug: 'ip-reputation-check',
  version: '1.0.0',
  availability: '>=9.5.0',
  name: 'IP Reputation Check',
  description: 'Assess the reputation of an IP address.',
  categories: ['enrichment'],
  definitionUrl: 'templates/ip-reputation-check/1.0.0.yaml',
  contentHash: 'sha256:abc',
  stepTypes: ['abuseipdb.checkIp'],
  triggerTypes: ['manual'],
  ...overrides,
});

describe('useCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('fetches the catalog and returns the unfiltered templates when no filters are given', async () => {
    const templates = [buildTemplate({ slug: 'a' }), buildTemplate({ slug: 'b' })];
    mockWorkflowApi.getCatalog.mockResolvedValue({ templates });

    const { result } = renderHook(() => useCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockWorkflowApi.getCatalog).toHaveBeenCalledWith();
    expect(result.current.templates.map((t) => t.slug)).toEqual(['a', 'b']);
    expect(result.current.allTemplates.map((t) => t.slug)).toEqual(['a', 'b']);
  });

  it('applies filterCatalog client-side over the fetched templates', async () => {
    const templates = [
      buildTemplate({ slug: 'a', name: 'Slack Notification' }),
      buildTemplate({ slug: 'b', name: 'Other' }),
    ];
    mockWorkflowApi.getCatalog.mockResolvedValue({ templates });

    const { result, rerender } = renderHook(({ search }) => useCatalog({ search }), {
      wrapper,
      initialProps: { search: '' },
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.templates).toHaveLength(2);

    rerender({ search: 'slack' });
    await waitFor(() => expect(result.current.templates.map((t) => t.slug)).toEqual(['a']));
    // The full catalog stays available for computing facet counts.
    expect(result.current.allTemplates).toHaveLength(2);
  });

  it('surfaces a react-query error state on API failure', async () => {
    mockWorkflowApi.getCatalog.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useCatalog(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.templates).toEqual([]);
  });
});
