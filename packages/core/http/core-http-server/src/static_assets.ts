/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

  /**
   * Will return an href, either a path for or full URL with the provided path
   * appended to the static assets public base path.
   *
   * Useful for instances were you need to render your own HTML page and link to
   * certain static assets.
   *
   * @example
   * ```ts
   * // I want to retrieve the href for Kibana's favicon, requires knowledge of path:
   * const favIconHref = core.http.statisAssets.prependPublicUrl('/ui/favicons/favicon.svg');
   * ```
   *
   * @note Only use this if you know what you are doing and there is no other option.
   *       This creates a strong coupling between asset dir structure and your code.
   * @param pathname
   */
  prependPublicUrl(pathname: string): string;
}
