/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { modifyUrl } from '@kbn/std';

export class BasePath {
  constructor(
    private readonly basePath: string = '',
    public readonly serverBasePath: string = basePath,
    public readonly publicBaseUrl?: string
  ) {}

  public get = () => {
    return this.basePath;
  };

  public prepend = (path: string): string => {
    if (!this.basePath) return path;
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
