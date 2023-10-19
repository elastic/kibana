/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BasePath } from './base_path_service';
import { CdnConfig } from './cdn';

export interface IStaticAssets {
  getHrefBase(): string;
}

export class StaticAssets implements IStaticAssets {
  constructor(private readonly basePath: BasePath, private readonly cdnConfig: CdnConfig) {}
  /**
   * Returns a href (hypertext reference) intended to be used as the base for constructing
   * other hrefs to static assets.
   */
  getHrefBase(): string {
    if (this.cdnConfig.baseHref) {
      return this.cdnConfig.baseHref;
    }
    return this.basePath.serverBasePath;
  }
}
