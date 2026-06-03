/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { modifyUrl } from '@kbn/std';
import type { KibanaRequest, IBasePath } from '@kbn/core-http-server';
import { ensureRawRequest, type FrameworkRawRequest } from '@kbn/core-http-router-server-internal';

/**
 * Core internal implementation of {@link IBasePath}
 *
 * @internal
 */
export class BasePath implements IBasePath {
  /**
   * Request-scoped path segments set by {@link IBasePath.set} (e.g. `/s/my-space`).
   *
   * Keys are usually the underlying Node `IncomingMessage` (`frameworkRequest.raw.req`) so that
   * multiple per-phase framework wrappers (Fastify builds fresh Hapi-shaped compat objects)
   * still resolve the same entry as Hapi's single `Request` instance per connection.
   */
  private readonly basePathCache = new WeakMap<object, string>();

  public readonly serverBasePath: string;
  public readonly publicBaseUrl?: string;

  constructor(serverBasePath: string = '', publicBaseUrl?: string) {
    this.serverBasePath = serverBasePath;
    this.publicBaseUrl = publicBaseUrl;
  }

  private getBasePathCacheKey(frameworkRequest: FrameworkRawRequest): object {
    const rawReq = (frameworkRequest as { raw?: { req?: unknown } }).raw?.req;
    if (rawReq !== undefined && rawReq !== null && typeof rawReq === 'object') {
      return rawReq as object;
    }
    return frameworkRequest;
  }

  public get = (request: KibanaRequest) => {
    const key = this.getBasePathCacheKey(ensureRawRequest(request));
    const requestScopePath = this.basePathCache.get(key) || '';
    return `${this.serverBasePath}${requestScopePath}`;
  };

  public set = (request: KibanaRequest, requestSpecificBasePath: string) => {
    const rawRequest = ensureRawRequest(request);
    const key = this.getBasePathCacheKey(rawRequest);

    if (this.basePathCache.has(key)) {
      throw new Error(
        'Request basePath was previously set. Setting multiple times is not supported.'
      );
    }
    this.basePathCache.set(key, requestSpecificBasePath);
  };

  public prepend = (path: string): string => {
    if (this.serverBasePath === '') return path;
    return modifyUrl(path, (parts) => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${this.serverBasePath}${parts.pathname}`;
      }
    });
  };

  public remove = (path: string): string => {
    if (this.serverBasePath === '') {
      return path;
    }

    if (path === this.serverBasePath) {
      return '/';
    }

    if (path.startsWith(`${this.serverBasePath}/`)) {
      return path.slice(this.serverBasePath.length);
    }

    return path;
  };
}
