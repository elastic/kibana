/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UiPlugins } from '@kbn/core-plugins-base-server-internal';
export interface PluginInfo {
  publicPath: string;
  bundlePath: string;
}
export declare const getPluginsBundlePaths: ({
  uiPlugins,
  bundlesHref,
  isAnonymousPage,
}: {
  uiPlugins: UiPlugins;
  bundlesHref: string;
  isAnonymousPage: boolean;
}) => Map<string, PluginInfo>;
