/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MessagePort } from 'worker_threads';
import { IRPCServer, RPCCallback, RPCRepository, RPCRequest, RPCResponse } from './types';

class RPCServer<TRepository extends RPCRepository> implements IRPCServer<TRepository> {
  private readonly definitions: TRepository = {} as TRepository;

  constructor(private readonly port: MessagePort) {
    port.addListener('message', this.onMessage);
  }

  destroy = () => {
    this.port.removeAllListeners();
  };

  onMessage = (event: any) => {
    if (!(typeof event === 'object' && event && 'rpc' in event)) {
      return;
    }

    const message = event as RPCRequest;

    const cb = this.definitions[message.rpc.request.name];

    const promise = Promise.resolve(
      typeof cb === 'function' ? cb(...message.rpc.request.input) : cb
    );

    promise
      .then((val) => {
        return {
          rpc: {
            response: {
              id: message.rpc.request.id,
              name: message.rpc.request.name,
              output: val,
            },
          },
        } satisfies RPCResponse;
      })
      .catch((error) => {
        return {
          rpc: {
            response: {
              id: message.rpc.request.id,
              name: message.rpc.request.name,
              error: {
                message: error.message,
              },
            },
          },
        } satisfies RPCResponse;
      })
      .then((msg) => {
        this.port.postMessage(msg);
      });
  };

  define = <TName extends string, TInput extends any[], TOutput>(
    name: TName,
    cb: (...args: TInput) => Promise<TOutput>
  ): IRPCServer<TRepository & { [name in TName]: RPCCallback<TInput, TOutput> }> => {
    Object.assign(this.definitions, { [name]: cb });

    return this;
  };
}

export function server(port: MessagePort): RPCServer<{}> {
  return new RPCServer<{}>(port);
}
