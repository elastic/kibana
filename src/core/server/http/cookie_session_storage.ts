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

import { Request, Server } from 'hapi';
import hapiAuthCookie from 'hapi-auth-cookie';

import { KibanaRequest, toRawRequest } from './router';
import { SessionStorageFactory, SessionStorage } from './session_storage';

export interface SessionStorageCookieOptions<T> {
  name: string;
  encryptionKey: string;
  validate: (sessionValue: T) => boolean | Promise<boolean>;
  isSecure: boolean;
}

class ScopedCookieSessionStorage<T extends Record<string, any>> implements SessionStorage<T> {
  constructor(private readonly server: Server, private readonly request: Readonly<Request>) {}
  public async get(): Promise<T | null> {
    try {
      return await this.server.auth.test('security-cookie', this.request as Request);
    } catch (error) {
      return null;
    }
  }
  public set(sessionValue: T) {
    return this.request.cookieAuth.set(sessionValue);
  }
  public clear() {
    return this.request.cookieAuth.clear();
  }
}

/**
 * Creates SessionStorage factory, which abstract the way of
 * session storage implementation and scoping to the incoming requests.
 *
 * @param server - hapi server to create SessionStorage for
 * @param cookieOptions - cookies configuration
 */
export async function createCookieSessionStorageFactory<T>(
  server: Server,
  cookieOptions: SessionStorageCookieOptions<T>,
  basePath?: string
): Promise<SessionStorageFactory<T>> {
  await server.register({ plugin: hapiAuthCookie });

  server.auth.strategy('security-cookie', 'cookie', {
    cookie: cookieOptions.name,
    password: cookieOptions.encryptionKey,
    validateFunc: async (req, session: T) => ({ valid: await cookieOptions.validate(session) }),
    isSecure: cookieOptions.isSecure,
    path: basePath,
    clearInvalid: true,
    isHttpOnly: true,
    isSameSite: false,
  });

  return {
    asScoped(request: Readonly<Request> | KibanaRequest) {
      const req = request instanceof KibanaRequest ? toRawRequest(request) : request;
      return new ScopedCookieSessionStorage<T>(server, req);
    },
  };
}
