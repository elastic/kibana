/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Observable } from 'rxjs';
import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { RealTimeJsonClient } from '../json';
import { RpcClient } from './rpc_client';
import { RpcMessageSubscribe, RpcMessageComplete, RpcMessageError, toPromise } from '../../common';

export interface RealTimeRpcParams {
  logger: Logger;
  savedObjectsClient: SavedObjectsClientContract;
  jsonClient: RealTimeJsonClient;
}

export type Future<T> = Promise<T> | Observable<T>;
export type Method = (payload: unknown) => Future<unknown>;
export type Methods = Record<string, undefined | Method>;

export const isSubscribeMessage = (x: unknown): x is RpcMessageSubscribe => {
  if (!Array.isArray(x) || (x.length !== 3 && x.length !== 2)) return false;

  const [id, method] = x as RpcMessageSubscribe;

  if (typeof id !== 'number') return false;
  if (id < 1) return false;
  if (Math.round(id) !== id) return false;

  if (typeof method !== 'string') return false;
  if (!method || method.length > 128) return false;

  return true;
};

export class RealTimeRpc {
  private methods: Methods;

  constructor(public readonly params: RealTimeRpcParams) {
    this.methods = (new RpcClient(params) as unknown) as Methods;
  }

  public async executeMethod(
    message: RpcMessageSubscribe
  ): Promise<RpcMessageComplete | RpcMessageError> {
    if (!isSubscribeMessage(message)) {
      throw new Error('Not a subscribe message');
    }

    const [id, name, payload] = message;

    try {
      if (!this.methods.hasOwnProperty(name)) {
        throw new Error(`Unknown method [${name}].`);
      }

      const method = this.methods[name];
      const future = method!(payload);
      const promise = toPromise(future);
      const result = await promise;

      return [0, id, result];
    } catch (error) {
      const errorResponse = {
        message: error instanceof Error ? error.message : String(error),
      };
      return [-1, id, errorResponse];
    }
  }
}
