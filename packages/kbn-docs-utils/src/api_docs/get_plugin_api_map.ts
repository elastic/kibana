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
import { MissingApiItemMap, PluginApi, ReferencedDeprecations } from './types';
import { removeBrokenLinks } from './utils';

export function getPluginApiMap(
  project: Project,
  plugins: KibanaPlatformPlugin[],
  log: ToolingLog,
  { collectReferences, pluginFilter }: { collectReferences: boolean; pluginFilter?: string[] }
): {
  pluginApiMap: { [key: string]: PluginApi };
  missingApiItems: MissingApiItemMap;
  referencedDeprecations: ReferencedDeprecations;
} {
  log.debug('Building plugin API map, getting missing comments, and collecting deprecations...');
  const pluginApiMap: { [key: string]: PluginApi } = {};
  plugins.map((plugin) => {
    const captureReferences =
      collectReferences && (!pluginFilter || pluginFilter.indexOf(plugin.manifest.id) >= 0);
    pluginApiMap[plugin.manifest.id] = getPluginApi(
      project,
      plugin,
      plugins,
      log,
      captureReferences
    );
  });

  // Mapping of plugin id to the missing source API id to all the plugin API items that referenced this item.
  const missingApiItems: { [key: string]: { [key: string]: string[] } } = {};
  const referencedDeprecations: ReferencedDeprecations = {};

  plugins.forEach((plugin) => {
    const id = plugin.manifest.id;
    const pluginApi = pluginApiMap[id];
    removeBrokenLinks(pluginApi, missingApiItems, pluginApiMap, log);
    collectDeprecations(pluginApi, referencedDeprecations);
  });
  return { pluginApiMap, missingApiItems, referencedDeprecations };
}

function collectDeprecations(pluginApi: PluginApi, referencedDeprecations: ReferencedDeprecations) {
  (['client', 'common', 'server'] as Array<'client' | 'server' | 'common'>).forEach((scope) => {
    pluginApi[scope].forEach((api) => {
      if ((api.tags || []).find((tag) => tag === 'deprecated')) {
        (api.references || []).forEach((ref) => {
          if (referencedDeprecations[ref.plugin] === undefined) {
            referencedDeprecations[ref.plugin] = [];
          }
          referencedDeprecations[ref.plugin].push({
            ref,
            deprecatedApi: api,
          });
        });
      }
    });
  });
}
