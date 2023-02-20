/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import { takeWhile, toArray } from 'rxjs/operators';
import { createCrudClientMock } from '../crud_client/crud_client.mock';
import { ContentClient } from './content_client';
import type { GetIn, CreateIn, UpdateIn, DeleteIn, SearchIn } from '../../common';

const setup = () => {
  const crudClient = createCrudClientMock();
  const contentClient = new ContentClient(() => crudClient);
  return { crudClient, contentClient };
};

describe('#get', () => {
  it('calls rpcClient.get with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: GetIn = { id: 'test', contentTypeId: 'testType' };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    expect(await contentClient.get(input)).toEqual(output);
    expect(crudClient.get).toBeCalledWith(input);
  });

  it('calls rpcClient.get$ with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: GetIn = { id: 'test', contentTypeId: 'testType' };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    const get$ = contentClient.get$(input).pipe(
      takeWhile((result) => {
        return result.data == null;
      }, true),
      toArray()
    );

    const [loadingState, loadedState] = await lastValueFrom(get$);

    expect(loadingState.isLoading).toBe(true);
    expect(loadingState.data).toBeUndefined();

    expect(loadedState.isLoading).toBe(false);
    expect(loadedState.data).toEqual(output);
  });
});

describe('#create', () => {
  it('calls rpcClient.create with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: CreateIn = { contentTypeId: 'testType', data: { foo: 'bar' } };
    const output = { test: 'test' };
    crudClient.create.mockResolvedValueOnce(output);

    expect(await contentClient.create(input)).toEqual(output);
    expect(crudClient.create).toBeCalledWith(input);
  });
});

describe('#update', () => {
  it('calls rpcClient.update with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: UpdateIn = { contentTypeId: 'testType', id: 'test', data: { foo: 'bar' } };
    const output = { test: 'test' };
    crudClient.update.mockResolvedValueOnce(output);

    expect(await contentClient.update(input)).toEqual(output);
    expect(crudClient.update).toBeCalledWith(input);
  });
});

describe('#delete', () => {
  it('calls rpcClient.delete with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: DeleteIn = { contentTypeId: 'testType', id: 'test' };
    const output = { test: 'test' };
    crudClient.delete.mockResolvedValueOnce(output);

    expect(await contentClient.delete(input)).toEqual(output);
    expect(crudClient.delete).toBeCalledWith(input);
  });
});

describe('#search', () => {
  it('calls rpcClient.search with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: SearchIn = { contentTypeId: 'testType', query: {} };
    const output = { hits: [{ id: 'test' }] };
    crudClient.search.mockResolvedValueOnce(output);
    expect(await contentClient.search(input)).toEqual(output);
    expect(crudClient.search).toBeCalledWith(input);
  });

  it('calls rpcClient.search$ with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: SearchIn = { contentTypeId: 'testType', query: {} };
    const output = { hits: [{ id: 'test' }] };
    crudClient.search.mockResolvedValueOnce(output);
    const search$ = contentClient.search$(input).pipe(
      takeWhile((result) => {
        return result.data == null;
      }, true),
      toArray()
    );

    const [loadingState, loadedState] = await lastValueFrom(search$);

    expect(loadingState.isLoading).toBe(true);
    expect(loadingState.data).toBeUndefined();

    expect(loadedState.isLoading).toBe(false);
    expect(loadedState.data).toEqual(output);
  });
});
