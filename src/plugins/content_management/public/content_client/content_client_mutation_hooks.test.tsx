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
import { RpcClient } from '../rpc_client';
import { createRpcClientMock } from '../rpc_client/rpc_client.mock';
import { useCreateContentMutation } from './content_client_mutation_hooks';
import type { CreateIn } from '../../common';

let contentClient: ContentClient;
let rpcClient: jest.Mocked<RpcClient>;
beforeEach(() => {
  rpcClient = createRpcClientMock();
  contentClient = new ContentClient(rpcClient);
});

const Wrapper: React.FC = ({ children }) => (
  <ContentClientProvider contentClient={contentClient}>{children}</ContentClientProvider>
);

describe('useCreateContentMutation', () => {
  test('should call rpcClient.create with input and resolve with output', async () => {
    const input: CreateIn = { contentType: 'testType', data: { foo: 'bar' } };
    const output = { test: 'test' };
    rpcClient.create.mockImplementation(() => Promise.resolve(output));
    const { result, waitFor } = renderHook(() => useCreateContentMutation(), { wrapper: Wrapper });
    result.current.mutate(input);

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(output);
  });
});
