/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BasePath } from './base_path_service';
import { CdnConfig } from './cdn';

export interface InternalStaticAssets {
  getHrefBase(): string;
  getPluginAssetHref(pluginName: string, assetPath: string): string;
}

export class StaticAssets implements InternalStaticAssets {
  private readonly assetsHrefBase: string;

  constructor(basePath: BasePath, cdnConfig: CdnConfig) {
    const hrefToUse = cdnConfig.baseHref ?? basePath.serverBasePath;
    this.assetsHrefBase = hrefToUse.endsWith('/') ? hrefToUse.slice(0, -1) : hrefToUse;
  }

  /**
   * Returns a href (hypertext reference) intended to be used as the base for constructing
   * other hrefs to static assets.
   */
  getHrefBase(): string {
    return this.assetsHrefBase;
  }

  getPluginAssetHref(pluginName: string, assetPath: string): string {
    if (assetPath.startsWith('/')) {
      assetPath = assetPath.slice(1);
    }
    return `${this.assetsHrefBase}/plugins/${pluginName}/assets/${assetPath}`;
  }
}
