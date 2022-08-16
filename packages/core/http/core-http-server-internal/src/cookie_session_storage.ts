/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifySecureSession from '@fastify/secure-session';

import type { Logger } from '@kbn/logging';
import type {
  KibanaRequest,
  SessionStorageFactory,
  SessionStorage,
  SessionStorageCookieOptions,
} from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';

class ScopedCookieSessionStorage<T extends Record<string, any>> implements SessionStorage<T> {
  constructor(private readonly request: FastifyRequest) {}

  public get(): T | null {
    return this.request.session.get('data') ?? null; // TODO: In the old implementation it handled the case where there were more than one cookie. Does Fastify handle this internally or should it be re-added somehow?
  }

  public set(sessionValue: T) {
    return this.request.session.set('data', sessionValue); // TODO: I think in Fastify I have to come up with a name (`sesssion` in this case), vs in hapi where it just "sets the session value on the session"
  }

  public clear() {
    return this.request.session.delete(); // TODO: Is `delete` in Fastify the same as `clear` in hapi?
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
 * @param server - Fastify server to create SessionStorage for
 * @param cookieOptions - cookies configuration
 */
export function createCookieSessionStorageFactory<T>(
  log: Logger,
  server: FastifyInstance,
  cookieOptions: SessionStorageCookieOptions<T>,
  basePath?: string
): SessionStorageFactory<T> {
  validateOptions(cookieOptions);

  // function clearInvalidCookie(reply: FastifyReply, path: string = basePath || '/') {
  //   // if the cookie did not include the 'path' attribute in the session value, it is a legacy cookie
  //   // we will assume that the cookie was created with the current configuration
  //   log.debug('Clearing invalid session cookie');
  //   reply.clearCookie(cookieOptions.name, { path }); // TODO: We could maybe also use `request.session.delete()`? That seems cleaner
  // }

  server.register(fastifySecureSession, {
    cookieName: cookieOptions.name,
    key: cookieOptions.encryptionKey,
    // TODO: Alternative implementation using `secret` instead of `key`:
    // secret: cookieOptions.encryptionKey, // TODO: Should we use `key` instaed of `secret`?
    // salt: 'changeme', // TODO: When using `secret` we need to specify a salt
    cookie: {
      secure: cookieOptions.isSecure,
      path: basePath === undefined ? '/' : basePath,
      httpOnly: true,
      sameSite:
        (cookieOptions.sameSite?.toLowerCase() as 'lax' | 'strict' | 'none' | undefined) ?? false, // TODO: Maybe we should change cookieOptions.sameSite to be lowercase
    },
  });

  // TODO: Implement `validateFunc` in Fastify
  // server.auth.strategy('security-cookie', 'cookie', {
  //   cookie: {
  //     name: cookieOptions.name,
  //     password: cookieOptions.encryptionKey,
  //     isSecure: cookieOptions.isSecure,
  //     path: basePath === undefined ? '/' : basePath,
  //     clearInvalid: false,
  //     isHttpOnly: true,
  //     isSameSite: cookieOptions.sameSite ?? false,
  //   },
  //   validateFunc: async (reply: FastifyReply, session: T | T[]) => {
  //     const result = cookieOptions.validate(session);
  //     if (!result.isValid) {
  //       clearInvalidCookie(reply, result.path);
  //     }
  //     return { valid: result.isValid };
  //   },
  // });

  return {
    asScoped(request: KibanaRequest) {
      return new ScopedCookieSessionStorage<T>(ensureRawRequest(request));
    },
  };
}
