/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lastValueFrom } from 'rxjs';
import { takeWhile, toArray } from 'rxjs';
import { createCrudClientMock } from '../crud_client/crud_client.mock';
import { ContentClient } from './content_client';
import type { GetIn, CreateIn, UpdateIn, DeleteIn, SearchIn, MSearchIn } from '../../common';
import { ContentTypeRegistry } from '../registry';

const setup = () => {
  const crudClient = createCrudClientMock();
  const contentTypeRegistry = new ContentTypeRegistry();
  contentTypeRegistry.register({
    id: 'testType',
    version: { latest: 3 },
  });
  const contentClient = new ContentClient(() => crudClient, contentTypeRegistry);
  return { crudClient, contentClient, contentTypeRegistry };
};

describe('#get', () => {
  it('calls rpcClient.get with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: GetIn = { id: 'test', contentTypeId: 'testType' };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    expect(await contentClient.get(input)).toEqual(output);
    expect(crudClient.get).toBeCalledWith({ ...input, version: 3 }); // latest version added
  });

  it('does not add the latest version if one is passed', async () => {
    const { crudClient, contentClient } = setup();
    const input: GetIn = { id: 'test', contentTypeId: 'testType', version: 1 };
    await contentClient.get(input);
    expect(crudClient.get).toBeCalledWith(input);
  });

  it('throws if version is not valid', async () => {
    const { contentClient } = setup();
    let input = { id: 'test', contentTypeId: 'testType', version: 'foo' }; // Invalid format
    await expect(async () => {
      contentClient.get(input as any);
    }).rejects.toThrowError('Invalid version [foo]. Must be an integer.');

    // @ts-expect-error
    input = { id: 'test', contentTypeId: 'testType', version: 4 }; // Latest version is 3
    await expect(async () => {
      contentClient.get(input as any);
    }).rejects.toThrowError('Invalid version [4]. Latest version is [3]');
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
    expect(crudClient.create).toBeCalledWith({ ...input, version: 3 }); // latest version added
  });

  it('does not add the latest version if one is passed', async () => {
    const { crudClient, contentClient } = setup();
    const input: CreateIn = { contentTypeId: 'testType', data: { foo: 'bar' }, version: 1 };
    await contentClient.create(input);
    expect(crudClient.create).toBeCalledWith(input);
  });
});

describe('#update', () => {
  it('calls rpcClient.update with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: UpdateIn = {
      contentTypeId: 'testType',
      id: 'test',
      data: { foo: 'bar' },
    };
    const output = { test: 'test' };
    crudClient.update.mockResolvedValueOnce(output);

    expect(await contentClient.update(input)).toEqual(output);
    expect(crudClient.update).toBeCalledWith({ ...input, version: 3 }); // latest version added
  });

  it('does not add the latest version if one is passed', async () => {
    const { crudClient, contentClient } = setup();

    const input: UpdateIn = {
      contentTypeId: 'testType',
      id: 'test',
      data: { foo: 'bar' },
      version: 1,
    };
    await contentClient.update(input);
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
    expect(crudClient.delete).toBeCalledWith({ ...input, version: 3 }); // latest version added
  });

  it('does not add the latest version if one is passed', async () => {
    const { crudClient, contentClient } = setup();
    const input: DeleteIn = { contentTypeId: 'testType', id: 'test', version: 1 };
    await contentClient.delete(input);
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
    expect(crudClient.search).toBeCalledWith({ ...input, version: 3 }); // latest version added
  });

  it('does not add the latest version if one is passed', async () => {
    const { crudClient, contentClient } = setup();
    const input: SearchIn = { contentTypeId: 'testType', query: {}, version: 1 };
    await contentClient.search(input);
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

describe('#mSearch', () => {
  it('calls rpcClient.mSearch with input and returns output', async () => {
    const { crudClient, contentClient } = setup();
    const input: MSearchIn = { contentTypes: [{ contentTypeId: 'testType' }], query: {} };
    const output = { hits: [{ id: 'test' }] };
    // @ts-ignore
    crudClient.mSearch.mockResolvedValueOnce(output);
    expect(await contentClient.mSearch(input)).toEqual(output);
    expect(crudClient.mSearch).toBeCalledWith({
      contentTypes: [{ contentTypeId: 'testType', version: 3 }], // latest version added
      query: {},
    });
  });
});
