/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Just the plugins system. The package's main entry also exports `PluginsService`, which pulls in
 * plugin discovery and costs ~140 MB when imported; a task pod only needs this.
 */
export { PluginsSystem } from './src/plugins_system';
export { PluginWrapper } from './src/plugin';
export type {
  PluginsServiceTasksSetupDeps,
  PluginsServiceTasksStartDeps,
} from './src/plugins_service';
export { pluginManifestFromPluginPackage } from './src/discovery/plugin_manifest_from_plugin_package';
