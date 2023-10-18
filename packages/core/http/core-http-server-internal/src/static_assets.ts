/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { KibanaRequest } from '@kbn/core-http-server/src/router';
import type { BasePath } from './base_path_service';
import { CdnConfig } from './cdn';

export class StaticAssets {
  constructor(private readonly basePath: BasePath, private readonly cdnConfig: CdnConfig) {}
  /**
   * Returns a href (hypertext reference) intended to be used as the base for constructing
   * other hrefs to static assets.
   */
  getHrefBase(request?: KibanaRequest): string {
    if (this.cdnConfig.url) {
      return this.cdnConfig.url;
    }
    // TODO: not sure if this is necessary for static asset HREFs.
    if (request) {
      return this.basePath.get(request);
    }
    return this.basePath.serverBasePath;
  }
}
