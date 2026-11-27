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
import { useConnectors, useLoadedConnectors } from './use_connectors';
import { testQueryClientConfig } from '../../test_utils';

const mockFetchConnectors = jest.fn();
jest.mock('@kbn/alerts-ui-shared/src/common/apis', () => ({
  fetchConnectors: () => mockFetchConnectors(),
}));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: {} } }),
}));

const connectors = [
  { id: 'slack-1', actionTypeId: '.slack' },
  { id: 'email-1', actionTypeId: '.email' },
];

const createWrapper = (queryClient: QueryClient): React.FC<React.PropsWithChildren<{}>> => {
  const Wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

/** A picker for one connector type next to the observer, as on the setup step. */
const usePickerAndObserver = () => ({
  picker: useConnectors('.slack'),
  observed: useLoadedConnectors(),
});

describe('useLoadedConnectors', () => {
  beforeEach(() => {
    mockFetchConnectors.mockReset();
  });

  it('never requests the connector list itself', () => {
    const { result } = renderHook(() => useLoadedConnectors(), {
      wrapper: createWrapper(new QueryClient(testQueryClientConfig)),
    });

    expect(result.current.isFetchedAfterMount).toBe(false);
    expect(mockFetchConnectors).not.toHaveBeenCalled();
  });

  it('receives the full list a picker loads, with no extra request', async () => {
    mockFetchConnectors.mockResolvedValue(connectors);
    const { result } = renderHook(usePickerAndObserver, {
      wrapper: createWrapper(new QueryClient(testQueryClientConfig)),
    });

    await waitFor(() => expect(result.current.observed.isFetchedAfterMount).toBe(true));
    expect(result.current.observed.data).toEqual(connectors);
    expect(result.current.picker.data).toEqual([connectors[0]]);
    expect(mockFetchConnectors).toHaveBeenCalledTimes(1);
  });

  it("leaves the picker's retries in place", async () => {
    mockFetchConnectors.mockRejectedValueOnce(new Error('Bad gateway'));
    mockFetchConnectors.mockResolvedValue(connectors);
    // The app's client has no retry default: queries retry 3 times.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    const { result } = renderHook(usePickerAndObserver, { wrapper: createWrapper(queryClient) });

    await waitFor(() => expect(result.current.observed.isFetchedAfterMount).toBe(true));
    expect(result.current.observed.status).toBe('success');
    expect(mockFetchConnectors).toHaveBeenCalledTimes(2);
  });
});
