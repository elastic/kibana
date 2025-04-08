/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MessagePort } from 'worker_threads';
import { server } from './server';
import { CallableKeysOf, RPCServerOf } from './types';
import {
  MethodNotAvailableInWorkerThreadContextError,
  MethodNotCallableInWorkerThreadContextError,
} from './errors';

export function rpcify<T extends Record<string, any>>(
  client: T,
  methods: Record<CallableKeysOf<T>, boolean>
): (port: MessagePort) => RPCServerOf<T> {
  return (port: MessagePort) => {
    const instance = server(port);

    Object.entries(methods).forEach(([key, value]) => {
      const method = client[key];
      if (!value) {
        instance.define(key, () => {
          throw new MethodNotAvailableInWorkerThreadContextError(key);
        });
        return;
      }

      if (typeof method !== 'function') {
        throw new MethodNotCallableInWorkerThreadContextError(key);
      }

      instance.define(key, (...args) => {
        return client[key](...args);
      });
    });

    return instance;
  };
}
