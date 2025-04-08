/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MaybePromise } from '@kbn/utility-types';
import { ValuesType } from 'utility-types';

export type RPCCallback<TInput extends any[] = any[], TOutput = any> = (
  ...input: TInput
) => Promise<TOutput>;

export type RPCRepository = Record<string, RPCCallback>;

export interface IRPCServer<TRepository extends RPCRepository = RPCRepository> {
  destroy(): void;
  define<TName extends string, TInput extends any[], TOutput>(
    name: TName,
    cb: (val: TInput) => MaybePromise<TOutput>
  ): IRPCServer<TRepository & { [name in TName]: RPCCallback<TInput, TOutput> }>;
}

export interface IRPCClient<TRepository extends RPCRepository = RPCRepository> {
  api: RPCRepository;
  request<TName extends keyof TRepository & string>(
    name: TName,
    ...input: InputOf<TRepository[TName]>
  ): Promise<OutputOf<TRepository[TName]>>;
  destroy: () => void;
}

export interface RPCRequest {
  rpc: {
    request: {
      name: string;
      id: string;
      input: unknown[];
    };
  };
}

interface RPCResponseFulfilled {
  rpc: {
    response: {
      name: string;
      id: string;
      output: unknown;
    };
  };
}

interface RPCResponseRejected {
  rpc: {
    response: {
      name: string;
      id: string;
      error: {
        message: string;
      };
    };
  };
}

export type RPCResponse = RPCResponseFulfilled | RPCResponseRejected;

export type RepositoryOf<TServer extends IRPCServer> = TServer extends IRPCServer<infer TRepository>
  ? TRepository extends RPCRepository
    ? TRepository
    : never
  : never;

export type InputOf<TDefinition extends RPCCallback> = Parameters<TDefinition>;
export type OutputOf<TDefinition extends RPCCallback> = TDefinition extends RPCCallback
  ? Awaited<ReturnType<TDefinition>>
  : never;

export type CallableKeysOf<T extends Record<string, any>> = ValuesType<{
  [key in keyof T]: T[key] extends RPCCallback ? key : never;
}>;

export type RPCServerOf<T extends Record<string, any>> = IRPCServer<{
  [key in CallableKeysOf<T>]: T[key] extends RPCCallback ? T[key] : never;
}>;
