/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { KibanaPlatformPlugin, ToolingLog } from '@kbn/dev-utils';
import { Project } from 'ts-morph';
import { getPluginApi } from './get_plugin_api';
import { MissingApiItemMap, PluginApi } from './types';
import { removeBrokenLinks } from './utils';

export function getPluginApiMap(
  project: Project,
  plugins: KibanaPlatformPlugin[],
  log: ToolingLog
): {
  pluginApiMap: { [key: string]: PluginApi };
  missingApiItems: MissingApiItemMap;
} {
  const pluginApiMap: { [key: string]: PluginApi } = {};
  plugins.map((plugin) => {
    pluginApiMap[plugin.manifest.id] = getPluginApi(project, plugin, plugins, log);
  });

  // Mapping of plugin id to the missing source API id to all the plugin API items that referenced this item.
  const missingApiItems: { [key: string]: { [key: string]: string[] } } = {};

  plugins.forEach((plugin) => {
    const id = plugin.manifest.id;
    const pluginApi = pluginApiMap[id];
    removeBrokenLinks(pluginApi, missingApiItems, pluginApiMap, log);
  });
  return { pluginApiMap, missingApiItems };
}
