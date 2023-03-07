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
import {
  useCreateContentMutation,
  useUpdateContentMutation,
  useDeleteContentMutation,
} from './content_client_mutation_hooks';
import type { CreateIn, UpdateIn, DeleteIn } from '../../common';

const setup = () => {
  const crudClient = createCrudClientMock();
  const contentClient = new ContentClient(() => crudClient);

  const Wrapper: React.FC = ({ children }) => (
    <ContentClientProvider contentClient={contentClient}>{children}</ContentClientProvider>
  );

  return {
    Wrapper,
    contentClient,
    crudClient,
  };
};

describe('useCreateContentMutation', () => {
  test('should call rpcClient.create with input and resolve with output', async () => {
    const { Wrapper, crudClient } = setup();
    const input: CreateIn = { contentTypeId: 'testType', data: { foo: 'bar' } };
    const output = { test: 'test' };
    crudClient.create.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useCreateContentMutation(), { wrapper: Wrapper });
    result.current.mutate(input);

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(output);
  });
});

describe('useUpdateContentMutation', () => {
  test('should call rpcClient.update with input and resolve with output', async () => {
    const { Wrapper, crudClient } = setup();
    const input: UpdateIn = { contentTypeId: 'testType', id: 'test', data: { foo: 'bar' } };
    const output = { test: 'test' };
    crudClient.update.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useUpdateContentMutation(), { wrapper: Wrapper });
    result.current.mutate(input);

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(output);
  });
});

describe('useDeleteContentMutation', () => {
  test('should call rpcClient.delete with input and resolve with output', async () => {
    const { Wrapper, crudClient } = setup();
    const input: DeleteIn = { contentTypeId: 'testType', id: 'test' };
    const output = { test: 'test' };
    crudClient.delete.mockResolvedValueOnce(output);
    const { result, waitFor } = renderHook(() => useDeleteContentMutation(), { wrapper: Wrapper });
    result.current.mutate(input);

    await waitFor(() => result.current.isSuccess);

    expect(result.current.data).toEqual(output);
  });
});
