/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { ContentClientProvider } from './content_client_context';
import { ContentClient } from './content_client';
import { createCrudClientMock } from '../crud_client/crud_client.mock';
import { useGetContentQuery, useSearchContentQuery } from './content_client_query_hooks';
import type { GetIn, SearchIn } from '../../common';
import { ContentTypeRegistry } from '../registry';

const setup = () => {
  const crudClient = createCrudClientMock();
  const contentTypeRegistry = new ContentTypeRegistry();
  contentTypeRegistry.register({
    id: 'testType',
    version: { latest: 2 },
  });
  const contentClient = new ContentClient(() => crudClient, contentTypeRegistry);

  const Wrapper: React.FC = ({ children }) => (
    <ContentClientProvider contentClient={contentClient}>{children}</ContentClientProvider>
  );

  return {
    Wrapper,
    contentClient,
    crudClient,
  };
};

describe('useGetContentQuery', () => {
  test('should call rpcClient.get with input and resolve with output', async () => {
    const { crudClient, Wrapper } = setup();
    const input: GetIn = { id: 'test', contentTypeId: 'testType', version: 2 };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useGetContentQuery(input), { wrapper: Wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(output);
  });
});

describe('useSearchContentQuery', () => {
  test('should call rpcClient.search with input and resolve with output', async () => {
    const { crudClient, Wrapper } = setup();
    const input: SearchIn = { contentTypeId: 'testType', query: {}, version: 2 };
    const output = { hits: [{ id: 'test' }] };
    crudClient.search.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useSearchContentQuery(input), {
      wrapper: Wrapper,
    });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(output);
  });
});
