/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 } from 'uuid';
import { mapValues } from 'lodash';
import { MessagePort } from 'worker_threads';
import { Logger } from '@kbn/logging';
import { IRPCClient, InputOf, OutputOf, RPCRepository, RPCRequest, RPCResponse } from './types';

type Callback<TOutput = any> = (...args: [Error, undefined] | [null, TOutput]) => void;

class RPCClient<TRepository extends RPCRepository> implements IRPCClient<TRepository> {
  private callbacks = new Map<string, Callback>();

  public api: TRepository;

  constructor(
    private readonly port: MessagePort,
    methods: Record<keyof TRepository, boolean>,
    private readonly logger: Logger
  ) {
    port.addListener('message', this.onMessage);
    this.api = mapValues(methods, (enabled, name) => {
      return (...input: Parameters<TRepository[string]>) => {
        if (!enabled) {
          throw new Error(`Method ${name} not enabled in worker context`);
        }
        return this.request(name, ...input);
      };
    }) as TRepository;
  }

  onMessage = (event: unknown) => {
    if (typeof event === 'object' && event && 'rpc' in event) {
      const message = event as RPCResponse;
      const id = message.rpc.response.id;
      const cb = this.callbacks.get(id);

      if (!cb) {
        return;
      }

      if ('error' in message.rpc.response) {
        cb(new Error(message.rpc.response.error.message), undefined);
        return;
      }

      cb(null, message.rpc.response.output);
    }
  };

  destroy() {
    this.port.removeAllListeners();
  }

  request<TName extends keyof TRepository & string>(
    name: TName,
    ...input: InputOf<TRepository[TName]>
  ): Promise<OutputOf<TRepository[TName]>> {
    const msg: RPCRequest = {
      rpc: {
        request: {
          id: v4(),
          name,
          input,
        },
      },
    };

    const now = performance.now();

    return new Promise<OutputOf<TRepository[TName]>>((resolve, reject) => {
      const fn: Callback<OutputOf<TRepository[TName]>> = (err, output) => {
        this.callbacks.delete(msg.rpc.request.id);
        this.logger.info(`received reply in ${(performance.now() - now).toPrecision(2)}ms`);
        if (err) reject(err);
        else resolve(output);
      };

      this.callbacks.set(msg.rpc.request.id, fn);

      this.port.postMessage(msg);
    });
  }
}

export function client<TRepository extends RPCRepository>(
  port: MessagePort,
  methods: {
    [key in keyof TRepository]: boolean;
  },
  logger: Logger
): RPCClient<TRepository> {
  return new RPCClient(port, methods, logger);
}
