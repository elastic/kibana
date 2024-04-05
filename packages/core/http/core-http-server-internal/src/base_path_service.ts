/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { modifyUrl } from '@kbn/std';
import { Request } from '@hapi/hapi';
import type { KibanaRequest, IBasePath } from '@kbn/core-http-server';
import { ensureRawRequest } from '@kbn/core-http-router-server-internal';

const isObject = (obj?: string | Record<string, string>): obj is Record<string, string> =>
  !!obj && typeof obj === 'object';

/**
 * Core internal implementation of {@link IBasePath}
 *
 * @internal
 */
export class BasePath implements IBasePath {
  private readonly basePathCache = new WeakMap<Request, string | Record<string, string>>();

  public readonly serverBasePath: string;
  public readonly publicBaseUrl?: string;

  constructor(serverBasePath: string = '', publicBaseUrl?: string) {
    this.serverBasePath = serverBasePath;
    this.publicBaseUrl = publicBaseUrl;
  }

  public get = (request: KibanaRequest) => {
    const cacheValue = this.basePathCache.get(ensureRawRequest(request));
    const requestScopePath = isObject(cacheValue)
      ? Object.values(cacheValue).join('')
      : cacheValue || '';

    return `${this.serverBasePath}${requestScopePath}`;
  };

  public set = (
    request: KibanaRequest,
    requestSpecificBasePath: string | { id: string; basePath: string }
  ) => {
    const rawRequest = ensureRawRequest(request);

    const cached = this.basePathCache.get(rawRequest);
    if (cached) {
      if (typeof cached === 'string' || typeof requestSpecificBasePath === 'string') {
        throw new Error(
          'Request basePath was previously set. Setting multiple times is not supported.'
        );
      }
      if (isObject(cached) && !isObject(requestSpecificBasePath)) {
        throw new Error(
          'Request basePath was previously set with an object. Setting with a string is not supported.'
        );
      }
    }
    let updatedCache: Record<string, string> | string;
    if (typeof cached === 'string' || typeof requestSpecificBasePath === 'string') {
      updatedCache = requestSpecificBasePath;
    } else {
      updatedCache = {
        ...cached,
        [requestSpecificBasePath.id]: requestSpecificBasePath.basePath,
      };
    }
    this.basePathCache.set(rawRequest, updatedCache);
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
