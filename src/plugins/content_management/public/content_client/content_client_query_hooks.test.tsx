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
import { CrudClient } from '../crud_client';
import { createCrudClientMock } from '../crud_client/crud_client.mock';
import { useGetContentQuery } from './content_client_query_hooks';
import type { GetIn } from '../../common';

let contentClient: ContentClient;
let crudClient: jest.Mocked<CrudClient>;
beforeEach(() => {
  crudClient = createCrudClientMock();
  contentClient = new ContentClient(() => crudClient);
});

const Wrapper: React.FC = ({ children }) => (
  <ContentClientProvider contentClient={contentClient}>{children}</ContentClientProvider>
);

describe('useGetContentQuery', () => {
  test('should call rpcClient.get with input and resolve with output', async () => {
    const input: GetIn = { id: 'test', contentType: 'testType' };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useGetContentQuery(input), { wrapper: Wrapper });
    await waitFor(() => result.current.isSuccess);
    expect(result.current.data).toEqual(output);
  });
});
