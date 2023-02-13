/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { lastValueFrom } from 'rxjs';
import { takeWhile, toArray } from 'rxjs/operators';
import type { CrudClient } from '../crud_client';
import { createCrudClientMock } from '../crud_client/crud_client.mock';
import { ContentClient } from './content_client';
import type { GetIn, CreateIn } from '../../common';

let contentClient: ContentClient;
let crudClient: jest.Mocked<CrudClient>;
beforeEach(() => {
  crudClient = createCrudClientMock();
  contentClient = new ContentClient(() => crudClient);
});

describe('#get', () => {
  it('calls rpcClient.get with input and returns output', async () => {
    const input: GetIn = { id: 'test', contentType: 'testType' };
    const output = { test: 'test' };
    crudClient.get.mockResolvedValueOnce(output);
    expect(await contentClient.get(input)).toEqual(output);
    expect(crudClient.get).toBeCalledWith(input);
  });

  it('calls rpcClient.get$ with input and returns output', async () => {
    const input: GetIn = { id: 'test', contentType: 'testType' };
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
    const input: CreateIn = { contentType: 'testType', data: { foo: 'bar' } };
    const output = { test: 'test' };
    crudClient.create.mockResolvedValueOnce(output);

    expect(await contentClient.create(input)).toEqual(output);
    expect(crudClient.create).toBeCalledWith(input);
  });
});
