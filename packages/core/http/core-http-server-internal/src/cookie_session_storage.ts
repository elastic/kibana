/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Request, Server } from '@hapi/hapi';
import hapiAuthCookie from '@hapi/cookie';

import type { Logger } from '@kbn/logging';
import type {
  KibanaRequest,
  SessionStorageFactory,
  SessionStorage,
  SessionStorageCookieOptions,
} from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';

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
        return session.credentials as T;
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
    cookie: {
      name: cookieOptions.name,
      password: cookieOptions.encryptionKey,
      isSecure: cookieOptions.isSecure,
      path: basePath === undefined ? '/' : basePath,
      clearInvalid: false,
      isHttpOnly: true,
      isSameSite: cookieOptions.sameSite ?? false,
    },
    validateFunc: async (req: Request, session: T | T[]) => {
      const result = cookieOptions.validate(session);
      if (!result.isValid) {
        clearInvalidCookie(req, result.path);
      }
      return { valid: result.isValid };
    },
  });

  return {
    asScoped(request: KibanaRequest) {
      return new ScopedCookieSessionStorage<T>(log, server, ensureRawRequest(request));
    },
  };
}
