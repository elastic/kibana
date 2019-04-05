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

export interface CookieOptions<T> {
  name: string;
  password: string;
  validate: (sessionValue: T) => boolean | Promise<boolean>;
  isSecure: boolean;
  sessionTimeout: number;
  path?: string;
}

export class ScopedSessionStorage<T extends Record<string, any>> {
  constructor(
    private readonly sessionGetter: () => Promise<T>,
    private readonly request: Request
  ) {}
  /**
   * Retrieves session value from the session storage.
   */
  public async get(): Promise<T> {
    return await this.sessionGetter();
  }
  /**
   * Puts current session value into the session storage.
   * @param sessionValue - value to put store into
   */
  public set(sessionValue: T) {
    return this.request.cookieAuth.set(sessionValue);
  }
  /**
   * Clears current session.
   */
  public clear() {
    return this.request.cookieAuth.clear();
  }
}

export interface SessionStorage<T> {
  asScoped: (request: Request) => ScopedSessionStorage<T>;
}

/**
 * Creates object with SessionStorage interface, which abstract the way of
 * session storage implementation.
 *
 * @param server - hapi server to create SessionStorage for
 * @param cookieOptions - cookies configuration
 */
export async function createCookieSessionStorageFor<T>(
  server: Server,
  cookieOptions: CookieOptions<T>
): Promise<SessionStorage<T>> {
  await server.register({ plugin: hapiAuthCookie });

  server.auth.strategy('security-cookie', 'cookie', {
    cookie: cookieOptions.name,
    password: cookieOptions.password,
    validateFunc: async (req, session: T) => ({ valid: await cookieOptions.validate(session) }),
    isSecure: cookieOptions.isSecure,
    path: cookieOptions.path,
    clearInvalid: true,
    isHttpOnly: true,
    isSameSite: false,
  });

  return {
    asScoped(request: Request) {
      return new ScopedSessionStorage<T>(
        () => server.auth.test('security-cookie', request),
        request
      );
    },
  };
}
