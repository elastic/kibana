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
// @ts-expect-error no TS definitions
import Statehood from 'statehood';

import { KibanaRequest, ensureRawRequest } from './router';
import { SessionStorageFactory, SessionStorage } from './session_storage';
import { Logger } from '..';

/**
 * Configuration used to create HTTP session storage based on top of cookie mechanism.
 * @public
 */
export interface SessionStorageCookieOptions<T> {
  /**
   * Name of the session cookie.
   */
  name: string;
  /**
   * A key used to encrypt a cookie's value. Should be at least 32 characters long.
   */
  encryptionKey: string;
  /**
   * Function called to validate a cookie's decrypted value.
   */
  validate: (sessionValue: T | T[]) => SessionCookieValidationResult;
  /**
   * Flag indicating whether the cookie should be sent only via a secure connection.
   */
  isSecure: boolean;
  /**
   * Defines SameSite attribute of the Set-Cookie Header.
   * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
   */
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Return type from a function to validate cookie contents.
 * @public
 */
export interface SessionCookieValidationResult {
  /**
   * Whether the cookie is valid or not.
   */
  isValid: boolean;
  /**
   * The "Path" attribute of the cookie; if the cookie is invalid, this is used to clear it.
   */
  path?: string;
}

class ScopedCookieSessionStorage<T extends Record<string, any>> implements SessionStorage<T> {
  constructor(
    private readonly log: Logger,
    private readonly server: Server,
    private readonly request: Request
  ) {}
  public async get(): Promise<T | null> {
    try {
      const session = await this.server.auth.test('security-cookie', this.request);
      // A browser can send several cookies, if it's not an array, just return the session value
      if (!Array.isArray(session)) {
        return session as T;
      }

      // If we have an array with one value, we're good also
      if (session.length === 1) {
        return session[0] as T;
      }

      // Otherwise, we have more than one and won't be authing the user because we don't
      // know which session identifies the actual user. There's potential to change this behavior
      // to ensure all valid sessions identify the same user, or choose one valid one, but this
      // is the safest option.
      this.log.warn(`Found ${session.length} auth sessions when we were only expecting 1.`);
      return null;
    } catch (error) {
      this.log.debug(String(error));
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

function validateOptions(options: SessionStorageCookieOptions<any>) {
  if (options.sameSite === 'None' && options.isSecure !== true) {
    throw new Error('"SameSite: None" requires Secure connection');
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
  log: Logger,
  server: Server,
  cookieOptions: SessionStorageCookieOptions<T>,
  basePath?: string
): Promise<SessionStorageFactory<T>> {
  validateOptions(cookieOptions);

  function clearInvalidCookie(req: Request | undefined, path: string = basePath || '/') {
    // if the cookie did not include the 'path' attribute in the session value, it is a legacy cookie
    // we will assume that the cookie was created with the current configuration
    log.debug('Clearing invalid session cookie');
    // need to use Hapi toolkit to clear cookie with defined options
    if (req) {
      (req.cookieAuth as any).h.unstate(cookieOptions.name, { path });
    }
  }

  await server.register({ plugin: hapiAuthCookie });

  server.auth.strategy('security-cookie', 'cookie', {
    cookie: cookieOptions.name,
    password: cookieOptions.encryptionKey,
    validateFunc: async (req, session: T | T[]) => {
      const result = cookieOptions.validate(session);
      if (!result.isValid) {
        clearInvalidCookie(req, result.path);
      }
      return { valid: result.isValid };
    },
    isSecure: cookieOptions.isSecure,
    path: basePath,
    clearInvalid: false,
    isHttpOnly: true,
    isSameSite: cookieOptions.sameSite === 'None' ? false : cookieOptions.sameSite ?? false,
  });

  // A hack to support SameSite: 'None'.
  // Remove it after update Hapi to v19 that supports SameSite: 'None' out of the box.
  if (cookieOptions.sameSite === 'None') {
    log.debug('Patching Statehood.prepareValue');
    const originalPrepareValue = Statehood.prepareValue;
    Statehood.prepareValue = function kibanaStatehoodPrepareValueWrapper(
      name: string,
      value: unknown,
      options: any
    ) {
      if (name === cookieOptions.name) {
        options.isSameSite = cookieOptions.sameSite;
      }
      return originalPrepareValue(name, value, options);
    };
  }

  return {
    asScoped(request: KibanaRequest) {
      return new ScopedCookieSessionStorage<T>(log, server, ensureRawRequest(request));
    },
  };
}
