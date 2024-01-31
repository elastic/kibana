/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BasePath } from '../base_path_service';
import { CdnConfig } from '../cdn_config';
import {
  suffixValueToPathname,
  suffixPathnameToURLPathname,
  removeSurroundingSlashes,
} from './util';

export interface InternalStaticAssets {
  getHrefBase(): string;
  /**
   * Intended for use by server code rendering UI or generating links to static assets
   * that will ultimately be called from the browser and must respect settings like
   * serverBasePath
   */
  getPluginAssetHref(pluginName: string, assetPath: string): string;
  /**
   * Intended for use by server code wanting to register static assets against Kibana
   * as server paths
   */
  getPluginServerPath(pluginName: string, assetPath: string): string;
  /**
   * Similar to getPluginServerPath, but not plugin-scoped
   */
  prependServerPath(pathname: string): string;

  /**
   * Will append the given path segment to the configured public path.
   *
   * @note This could return a path or full URL depending on whether a CDN is configured.
   */
  appendPathToPublicUrl(pathname: string): string;
}

/**
 * Convention is for trailing slashes in pathnames are stripped.
 */
export class StaticAssets implements InternalStaticAssets {
  private readonly assetsHrefBase: string;
  private readonly assetsServerPathBase: string;
  private readonly hasCdnHost: boolean;

  constructor(basePath: BasePath, cdnConfig: CdnConfig, shaDigest: string) {
    const cdnBaseHref = cdnConfig.baseHref;
    if (cdnBaseHref) {
      this.hasCdnHost = true;
      this.assetsHrefBase = suffixPathnameToURLPathname(cdnBaseHref, shaDigest);
    } else {
      this.hasCdnHost = false;
      this.assetsHrefBase = suffixValueToPathname(basePath.serverBasePath, shaDigest);
    }
    this.assetsServerPathBase = `/${shaDigest}`;
  }

  /**
   * Returns a href (hypertext reference) intended to be used as the base for constructing
   * other hrefs to static assets.
   */
  public getHrefBase(): string {
    return this.assetsHrefBase;
  }

  public getPluginAssetHref(pluginName: string, assetPath: string): string {
    if (assetPath.startsWith('/')) {
      assetPath = assetPath.slice(1);
    }
    return `${this.assetsHrefBase}/plugins/${pluginName}/assets/${removeSurroundingSlashes(
      assetPath
    )}`;
  }

  public prependServerPath(path: string): string {
    return `${this.assetsServerPathBase}/${removeSurroundingSlashes(path)}`;
  }

  public appendPathToPublicUrl(pathname: string): string {
    pathname = removeSurroundingSlashes(pathname);
    if (this.hasCdnHost) {
      return suffixPathnameToURLPathname(this.assetsHrefBase, pathname);
    }
    return suffixValueToPathname(this.assetsHrefBase, pathname);
  }

  public getPluginServerPath(pluginName: string, assetPath: string): string {
    return `${this.assetsServerPathBase}/plugins/${pluginName}/assets/${removeSurroundingSlashes(
      assetPath
    )}`;
  }
}
