/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RpcClient } from '../rpc_client';
import { createRpcClientMock } from '../rpc_client/rpc_client.mock';
import { ContentClient } from './content_client';
import type { GetIn, CreateIn } from '../../common';
import { lastValueFrom } from 'rxjs';
import { takeWhile, toArray } from 'rxjs/operators';

describe('ContentClient', () => {
  let contentClient: ContentClient;
  let rpcClient: jest.Mocked<RpcClient>;
  beforeEach(() => {
    rpcClient = createRpcClientMock();
    contentClient = new ContentClient(rpcClient);
  });

  describe('#get', () => {
    it('calls rpcClient.get with input', async () => {
      const input: GetIn = { id: 'test', contentType: 'testType' };
      await contentClient.get(input);
      expect(rpcClient.get).toBeCalledWith(input);
    });

    it('calls rpcClient.get$ with input', async () => {
      const input: GetIn = { id: 'test', contentType: 'testType' };
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
      expect(loadedState.data).toEqual({});
    });
  });

  describe('#create', () => {
    it('calls rpcClient.create with input', async () => {
      const input: CreateIn = { contentType: 'testType', data: { foo: 'bar' } };
      await contentClient.create(input);
      expect(rpcClient.create).toBeCalledWith(input);
    });
  });
});
