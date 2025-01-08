/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { API_ENDPOINT } from '../../common';
import { procedureNames } from '../../common/rpc';

import { RpcClient } from './rpc_client';

describe('RpcClient', () => {
  test('should expose a handler to call each of the procedures', async () => {
    /**
     * This test ensure that there is a public method on the RpcClient to call every procedure
     * on the server.
     */

    const proceduresSpys = procedureNames.reduce<{
      [key: string]: { name: string; spy: jest.Mock };
    }>(
      (acc, name) => ({
        ...acc,
        [name]: {
          name,
          spy: jest.fn(),
        },
      }),
      {}
    );

    const post = jest.fn(async (endPoint: string, data: any) => {
      const [_, name] = endPoint.split(`${API_ENDPOINT}/`);
      proceduresSpys[name]?.spy(endPoint, data);
      return { result: `${name}mockedResponse` };
    });

    const rpcClient = new RpcClient({ post: post as any });

    await rpcClient.get({ contentTypeId: 'foo', id: '123' });
    await rpcClient.bulkGet({ contentTypeId: 'foo', ids: ['123'] });
    await rpcClient.create({ contentTypeId: 'foo', data: {} });
    await rpcClient.update({ contentTypeId: 'foo', id: '123', data: {} });
    await rpcClient.delete({ contentTypeId: 'foo', id: '123' });
    await rpcClient.search({ contentTypeId: 'foo', query: {} });
    await rpcClient.mSearch({ contentTypes: [{ contentTypeId: 'foo' }], query: {} });

    Object.values(proceduresSpys).forEach(({ name, spy }) => {
      expect(spy).toHaveBeenCalledWith(`${API_ENDPOINT}/${name}`, { body: expect.any(String) });
    });
  });
});
