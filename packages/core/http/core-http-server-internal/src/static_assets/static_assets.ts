/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BasePath } from '../base_path_service';
import { CdnConfig } from '../cdn_config';

export interface InternalStaticAssets {
  getHrefBase(): string;
  getPluginAssetHref(pluginName: string, assetPath: string): string;
}

import { suffixValueToPathname, suffixValueToURLPathname } from './suffix_value_to_pathname';

export class StaticAssets implements InternalStaticAssets {
  private readonly assetsHrefBase: string;

  constructor(basePath: BasePath, cdnConfig: CdnConfig, shaDigest: string) {
    const cdnBaseHref = cdnConfig.baseHref;
    if (cdnBaseHref) {
      this.assetsHrefBase = suffixValueToURLPathname(cdnBaseHref, shaDigest);
    } else {
      this.assetsHrefBase = suffixValueToPathname(basePath.serverBasePath, shaDigest);
    }
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
