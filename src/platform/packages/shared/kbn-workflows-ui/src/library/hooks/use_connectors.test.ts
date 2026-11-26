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
import { useConnectors, useLoadConnectors } from './use_connectors';
import { testQueryClientConfig } from '../../test_utils';

const mockFetchConnectors = jest.fn();
jest.mock('@kbn/alerts-ui-shared/src/common/apis', () => ({
  fetchConnectors: () => mockFetchConnectors(),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: {} } }),
}));

const queryClient = new QueryClient(testQueryClientConfig);

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children);

const connectors = [
  { id: 'slack-1', actionTypeId: '.slack' },
  { id: 'email-1', actionTypeId: '.email' },
];

/** A picker for one connector type next to the loader, as on the setup step. */
const usePickerAndLoader = () => ({
  picker: useConnectors('.slack'),
  loadConnectors: useLoadConnectors(),
});

describe('useLoadConnectors', () => {
  beforeEach(() => {
    mockFetchConnectors.mockReset();
    queryClient.clear();
  });

  it('loads the connector list when there is none yet', async () => {
    mockFetchConnectors.mockResolvedValue(connectors);
    const { result } = renderHook(() => useLoadConnectors(), { wrapper });

    await expect(result.current()).resolves.toEqual(connectors);
    expect(mockFetchConnectors).toHaveBeenCalledTimes(1);
  });

  it('reuses the list a picker already loaded, without a request', async () => {
    mockFetchConnectors.mockResolvedValue(connectors);
    const { result } = renderHook(usePickerAndLoader, { wrapper });
    await waitFor(() => expect(result.current.picker.isSuccess).toBe(true));

    await expect(result.current.loadConnectors()).resolves.toEqual(connectors);
    expect(mockFetchConnectors).toHaveBeenCalledTimes(1);
  });

  it('joins the request a picker has in flight', async () => {
    let resolveFetch: (value: typeof connectors) => void = () => {};
    mockFetchConnectors.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );
    const { result } = renderHook(usePickerAndLoader, { wrapper });
    await waitFor(() => expect(mockFetchConnectors).toHaveBeenCalledTimes(1));

    const loaded = result.current.loadConnectors();
    resolveFetch(connectors);

    await expect(loaded).resolves.toEqual(connectors);
    expect(mockFetchConnectors).toHaveBeenCalledTimes(1);
  });
});
