/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as iron from '@hapi/iron';
import { isDeepStrictEqual } from 'util';
import type { FastifyReply } from 'fastify';
import type { Logger } from '@kbn/logging';
import type {
  KibanaRequest,
  SessionStorage,
  SessionStorageCookieOptions,
  SessionStorageFactory,
  SessionStorageSetOptions,
} from '@kbn/core-http-server';

import { ensureRawRequest } from '@kbn/core-http-router-server-internal';
import { mergeSetCookieHeaderValues } from './fastify_set_cookie_merge';

const IRON_DEFAULTS: iron.SealOptions = {
  ...iron.defaults,
};

interface RawHttpAccess {
  cookieHeader: string | undefined;
  setCookies: (cookieStrings: string[]) => void;
}

/**
 * Reads/writes the raw HTTP cookie state from the request the Kibana router resolved.
 * This intentionally targets the FastifyReply raw `ServerResponse`, which is exposed via
 * the Hapi-shaped `raw.res` field on the request object built by
 * `buildHapiCompatRequestFromFastify`.
 */
const getRawHttpAccess = (kbnRequest: KibanaRequest): RawHttpAccess | null => {
  const raw = ensureRawRequest(kbnRequest) as unknown as {
    app?: { fastifyReply?: FastifyReply };
    raw?: { req?: { headers?: { cookie?: string } }; res?: import('http').ServerResponse };
    headers?: { cookie?: string };
  };
  const cookieHeader = raw.raw?.req?.headers?.cookie ?? raw.headers?.cookie;
  const res = raw.raw?.res;
  const fastifyReply = raw.app?.fastifyReply;
  if (!res && !fastifyReply) return null;
  return {
    cookieHeader,
    setCookies(cookieStrings) {
      if (!cookieStrings.length) return;
      if (fastifyReply && !fastifyReply.sent) {
        // Fastify appends `set-cookie` on each `header()` call; merge then replace (Hapi replaces).
        const merged = mergeSetCookieHeaderValues(
          fastifyReply.getHeader('set-cookie'),
          cookieStrings
        );
        fastifyReply.removeHeader('set-cookie');
        if (merged.length > 0) {
          fastifyReply.header('set-cookie', merged);
        }
        if (!fastifyReply.raw.headersSent) {
          fastifyReply.raw.removeHeader('Set-Cookie');
        }
        return;
      }
      if (res && !res.headersSent) {
        res.setHeader(
          'Set-Cookie',
          mergeSetCookieHeaderValues(res.getHeader('Set-Cookie'), cookieStrings)
        );
      }
    },
  };
};

const parseAllCookieValuesForName = (header: string | undefined, name: string): string[] => {
  if (!header) return [];
  const values: string[] = [];
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k !== name) continue;
    values.push(decodeURIComponent(part.slice(eq + 1).trim()));
  }
  return values;
};

interface SerializeOptions {
  isSecure?: boolean;
  isHttpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None' | false;
  path: string;
  partitioned?: boolean;
  expires?: Date;
}

const serializeCookie = (name: string, value: string, options: SerializeOptions): string => {
  const parts: string[] = [`${name}=${encodeURIComponent(value)}`];
  if (options.expires && options.expires.getTime() <= 0) {
    parts.push('Max-Age=0');
    parts.push(`Expires=${options.expires.toUTCString()}`);
  } else if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.isHttpOnly) parts.push('HttpOnly');
  if (options.isSecure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.partitioned) parts.push('Partitioned');
  parts.push(`Path=${options.path}`);
  return parts.join('; ');
};

class ScopedFastifyCookieSessionStorage<T extends object> implements SessionStorage<T> {
  constructor(
    private readonly log: Logger,
    private readonly cookieOptions: SessionStorageCookieOptions<T>,
    private readonly basePath: string,
    private readonly disableEmbedding: boolean,
    private readonly request: KibanaRequest
  ) {}

  public async get(): Promise<T | null> {
    const access = getRawHttpAccess(this.request);
    if (!access) return null;

    const sealedValues = parseAllCookieValuesForName(access.cookieHeader, this.cookieOptions.name);
    if (sealedValues.length === 0) return null;

    const credentials: T[] = [];
    for (const sealed of sealedValues) {
      try {
        const value = (await iron.unseal(
          sealed,
          this.cookieOptions.encryptionKey,
          IRON_DEFAULTS
        )) as T;
        const result = this.cookieOptions.validate(value);
        if (!result.isValid) {
          this.clearWithPath(result.path ?? this.basePath);
          return null;
        }
        credentials.push(value);
      } catch (err) {
        this.log.debug(`Failed to read session cookie: ${(err as Error)?.message ?? err}`);
      }
    }

    if (credentials.length === 0) {
      return null;
    }

    if (credentials.length === 1) {
      return credentials[0];
    }

    if (credentials.length > 1) {
      this.log.warn(
        `Found multiple auth sessions. Found:[${credentials.length}] sessions. Checking equality...`
      );
      const [firstSession, ...rest] = credentials;
      const allEqual = rest.every((session) => isDeepStrictEqual(session, firstSession));
      if (allEqual) {
        this.log.error(
          `Found multiple auth sessions. Found:[${credentials.length}] equal sessions`
        );
        return firstSession;
      }
    }

    this.log.error(`Found multiple auth sessions. Found:[${credentials.length}] unequal sessions`);
    return null;
  }

  public async set(sessionValue: T, options?: SessionStorageSetOptions): Promise<void> {
    const access = getRawHttpAccess(this.request);
    if (!access) return;

    const isSecure = options?.isSecure ?? this.cookieOptions.isSecure;
    const sameSite = options?.sameSite ?? this.cookieOptions.sameSite ?? false;
    const partitioned = sameSite === 'None' && Boolean(isSecure) && !this.disableEmbedding;

    const writePromise = (async () => {
      const sealed = await iron.seal(
        sessionValue as unknown,
        this.cookieOptions.encryptionKey,
        IRON_DEFAULTS
      );
      access.setCookies([
        serializeCookie(this.cookieOptions.name, sealed, {
          path: this.basePath,
          isHttpOnly: true,
          isSecure: Boolean(isSecure),
          sameSite,
          partitioned,
        }),
      ]);
    })();

    const raw = ensureRawRequest(this.request) as unknown as {
      app?: { pendingCookieWrites?: Array<Promise<unknown>> };
    };
    const app = raw.app ?? (raw.app = {});
    app.pendingCookieWrites = app.pendingCookieWrites ?? [];
    app.pendingCookieWrites.push(writePromise);
    await writePromise;
  }

  public clear(): void {
    this.clearWithPath(this.basePath);
  }

  private clearWithPath(path: string) {
    const access = getRawHttpAccess(this.request);
    if (!access) return;
    const raw = ensureRawRequest(this.request) as unknown as {
      app?: { pendingCookieWrites?: Array<Promise<unknown>> };
    };
    const app = raw.app;
    if (app?.pendingCookieWrites?.length) {
      app.pendingCookieWrites = [];
    }
    access.setCookies([
      serializeCookie(this.cookieOptions.name, '', {
        path: path || '/',
        isHttpOnly: true,
        isSecure: this.cookieOptions.isSecure,
        sameSite: this.cookieOptions.sameSite ?? false,
        expires: new Date(0),
      }),
    ]);
  }
}

const validateOptions = <T>(options: SessionStorageCookieOptions<T>) => {
  if (options.sameSite === 'None' && options.isSecure !== true) {
    throw new Error('"SameSite: None" requires Secure connection');
  }
};

/**
 * Creates a Fastify-backed `SessionStorageFactory` whose cookie wire format is identical
 * to the Hapi backend (`@hapi/cookie` -> `@hapi/iron`). This means sessions survive a
 * runtime swap of the `server.experimental.framework` flag.
 *
 * @internal
 */
export const createFastifyCookieSessionStorageFactory = async <T extends object>(
  log: Logger,
  cookieOptions: SessionStorageCookieOptions<T>,
  disableEmbedding: boolean,
  basePath?: string
): Promise<SessionStorageFactory<T>> => {
  validateOptions(cookieOptions);
  const path = basePath === undefined ? '/' : basePath;
  // Used by the in-development equality assertion to stop accidental option changes
  // surprising operators after migration.
  if (process.env.KIBANA_FASTIFY_DEBUG_SESSIONS) {
    log.warn(
      `[Fastify backend] cookie session options snapshot: ${JSON.stringify({
        name: cookieOptions.name,
        isSecure: cookieOptions.isSecure,
        sameSite: cookieOptions.sameSite,
        partitionedExpected:
          cookieOptions.sameSite === 'None' && cookieOptions.isSecure && !disableEmbedding,
        path,
      })}`
    );
  }
  // Reference `isDeepStrictEqual` so the import isn't dropped under tree-shaking; future
  // work may want to compare cookie payloads to avoid redundant Set-Cookie writes.
  void isDeepStrictEqual;

  return {
    asScoped(request: KibanaRequest) {
      return new ScopedFastifyCookieSessionStorage<T>(
        log,
        cookieOptions,
        path,
        disableEmbedding,
        request
      );
    },
  };
};
