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
import { Request } from 'hapi';
import { KibanaRequest, toRawRequest } from './router';

export enum AuthStatus {
  authenticated = 'authenticated',
  unauthenticated = 'unauthenticated',
  unknown = 'unknown',
}

const getIncomingMessage = (request: KibanaRequest | Request) =>
  request instanceof KibanaRequest ? toRawRequest(request).raw.req : request.raw.req;

export class AuthStateStorage {
  private readonly storage = new WeakMap<ReturnType<typeof getIncomingMessage>, unknown>();
  constructor(private readonly canBeAuthenticated: () => boolean) {}
  public set = (request: KibanaRequest | Request, state: unknown) => {
    this.storage.set(getIncomingMessage(request), state);
  };
  public get = (request: KibanaRequest | Request) => {
    const key = getIncomingMessage(request);
    const state = this.storage.get(key);
    const status: AuthStatus = this.storage.has(key)
      ? AuthStatus.authenticated
      : this.canBeAuthenticated()
      ? AuthStatus.unauthenticated
      : AuthStatus.unknown;

    return { status, state };
  };
  public isAuthenticated = (request: KibanaRequest | Request) => {
    return this.get(request).status === AuthStatus.authenticated;
  };
}
