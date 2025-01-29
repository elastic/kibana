/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IBasePath } from '@kbn/core-http-browser';
import { modifyUrl } from '@kbn/std';

export class BasePath implements IBasePath {
  private readonly basePath: string;
  public readonly serverBasePath: string;
  public readonly assetsHrefBase: string;
  public readonly publicBaseUrl?: string;

  constructor({
    basePath,
    serverBasePath,
    assetsHrefBase,
    publicBaseUrl,
  }: {
    basePath: string;
    serverBasePath?: string;
    assetsHrefBase?: string;
    publicBaseUrl?: string;
  }) {
    this.basePath = basePath;
    this.serverBasePath = serverBasePath ?? this.basePath;
    this.assetsHrefBase = assetsHrefBase ?? this.serverBasePath;
    this.publicBaseUrl = publicBaseUrl;
  }

  public get = () => {
    return this.basePath;
  };

  public prepend = (path: string): string => {
    if (!this.basePath) {
      return path;
    }
    return modifyUrl(path, (parts) => {
      if (!parts.hostname && parts.pathname && parts.pathname.startsWith('/')) {
        parts.pathname = `${this.basePath}${parts.pathname}`;
      }
    });
  };

  public remove = (path: string): string => {
    if (!this.basePath) {
      return path;
    }

    if (path === this.basePath) {
      return '/';
    }

    if (path.startsWith(`${this.basePath}/`)) {
      return path.slice(this.basePath.length);
    }

    return path;
  };
}
