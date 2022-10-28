/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { PluginsService } from './plugins_service';
export type {
  PluginsServiceSetup,
  PluginsServiceStart,
  DiscoveredPlugins,
} from './plugins_service';
export { config } from './plugins_config';
/** @internal */
export { isNewPlatformPlugin } from './discovery';
export type { PluginDependencies } from './types';
export { PluginWrapper } from './plugin';
