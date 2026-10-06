/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
/**
 * Gets the array of plugins that should be enabled on the page.
 *  * If this _is not_ an anonymous page, all plugins will be enabled.
 *  * If this _is_ an anonymous page, only plugins that have "enabledOnAnonymousPages" set in their manifest *and* the graph of their
 *    requiredPlugins will be enabled.
 */
export declare function filterUiPlugins({
  uiPlugins,
  isAnonymousPage,
}: {
  uiPlugins: UiPlugins;
  isAnonymousPage: boolean;
}): [string, import('@kbn/core/server').DiscoveredPlugin][];
