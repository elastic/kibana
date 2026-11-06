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

/**
 * Core internal implementation of {@link IBasePath}
 *
 * @internal
 */
export class BasePath implements IBasePath {
  public readonly serverBasePath: string;
  public readonly publicBaseUrl?: string;

  constructor(serverBasePath: string = '', publicBaseUrl?: string) {
    this.serverBasePath = serverBasePath;
    this.publicBaseUrl = publicBaseUrl;
  }

  public get = (request: KibanaRequest) => {
    return request.basePath;
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
