/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { modifyUrl } from '@kbn/std';

import { ensureRawRequest, KibanaRequest, LegacyRequest } from './router';

/**
 * Access or manipulate the Kibana base path
 *
 * @public
 */
export class BasePath {
  private readonly basePathCache = new WeakMap<LegacyRequest, string>();

  /**
   * returns the server's basePath
   *
   * See {@link BasePath.get} for getting the basePath value for a specific request
   */
  public readonly serverBasePath: string;
  /**
   * The server's publicly exposed base URL, if configured. Includes protocol, host, port (optional) and the
   * {@link BasePath.serverBasePath}.
   *
   * @remarks
   * Should be used for generating external URL links back to this Kibana instance.
   */
  public readonly publicBaseUrl?: string;

  /** @internal */
  constructor(serverBasePath: string = '', publicBaseUrl?: string) {
    this.serverBasePath = serverBasePath;
    this.publicBaseUrl = publicBaseUrl;
  }

  /**
   * returns `basePath` value, specific for an incoming request.
   */
  public get = (request: KibanaRequest | LegacyRequest) => {
    const requestScopePath = this.basePathCache.get(ensureRawRequest(request)) || '';
    return `${this.serverBasePath}${requestScopePath}`;
  };

  /**
   * sets `basePath` value, specific for an incoming request.
   *
   * @privateRemarks should work only for KibanaRequest as soon as spaces migrate to NP
   */
  public set = (request: KibanaRequest | LegacyRequest, requestSpecificBasePath: string) => {
    const rawRequest = ensureRawRequest(request);

    if (this.basePathCache.has(rawRequest)) {
      throw new Error(
        'Request basePath was previously set. Setting multiple times is not supported.'
      );
    }
    this.basePathCache.set(rawRequest, requestSpecificBasePath);
  };

  /**
   * Prepends `path` with the basePath.
   */
  public prepend = (path: string): string => {
    if (this.serverBasePath === '') return path;
    return modifyUrl(path, (parts) => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${this.serverBasePath}${parts.pathname}`;
      }
    });
  };

  /**
   * Removes the prepended basePath from the `path`.
   */
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

/**
 * Access or manipulate the Kibana base path
 *
 * {@link BasePath}
 * @public
 */
export type IBasePath = Pick<BasePath, keyof BasePath>;
