/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * APIs for creating hrefs to static assets.
 *
 * @public
 */
export interface IStaticAssets {
  /**
   * Gets the full href to the current plugin's asset,
   * given its path relative to the plugin's `public/assets` folder.
   *
   * @example
   * ```ts
   * // I want to retrieve the href for the asset stored under `my_plugin/public/assets/some_folder/asset.png`:
   * const assetHref = core.http.statisAssets.getPluginAssetHref('some_folder/asset.png');
   * ```
   */
  getPluginAssetHref(assetPath: string): string;
}
