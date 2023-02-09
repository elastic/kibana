/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RpcClient } from './rpc_client';
import { PublicMethodsOf } from '@kbn/utility-types';

export const createRpcClientMock = (): jest.Mocked<RpcClient> => {
  const mock: jest.Mocked<PublicMethodsOf<RpcClient>> = {
    get: jest.fn((input) => Promise.resolve({} as any)),
    create: jest.fn((input) => Promise.resolve({} as any)),
  };
  return mock as jest.Mocked<RpcClient>;
};
