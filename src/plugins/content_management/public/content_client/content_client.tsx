/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { QueryClient } from '@tanstack/react-query';
import { createQueryObservable } from './query_observable';
import type { RpcClient } from '../rpc_client';
import type { CreateIn, GetIn } from '../../common';

const queryKeyBuilder = {
  all: (type: string) => [type] as const,
  item: (type: string, id: string) => {
    return [...queryKeyBuilder.all(type), id] as const;
  },
};

const createQueryOptionBuilder = ({ rpcClient }: { rpcClient: RpcClient }) => {
  return {
    get: <I extends GetIn = GetIn, O = unknown>(input: I) => {
      return {
        queryKey: queryKeyBuilder.item(input.contentType, input.id),
        queryFn: () => rpcClient.get<I, O>(input),
      };
    },
  };
};

export class ContentClient {
  readonly queryClient: QueryClient;
  readonly queryOptionBuilder: ReturnType<typeof createQueryOptionBuilder>;

  constructor(private readonly rpcClient: RpcClient) {
    this.queryClient = new QueryClient();
    this.queryOptionBuilder = createQueryOptionBuilder({
      rpcClient: this.rpcClient,
    });
  }

  get<I extends GetIn = GetIn, O = unknown>(input: I): Promise<O> {
    return this.queryClient.fetchQuery(this.queryOptionBuilder.get(input));
  }

  get$<I extends GetIn = GetIn, O = unknown>(input: I) {
    return createQueryObservable(this.queryClient, this.queryOptionBuilder.get<I, O>(input));
  }

  create<I extends CreateIn, O = any>(input: I): Promise<O> {
    return this.rpcClient.create(input);
  }
}
