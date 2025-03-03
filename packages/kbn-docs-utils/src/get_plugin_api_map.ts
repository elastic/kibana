/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Project } from 'ts-morph';
import { getPluginApi } from './get_plugin_api';
import type {
  AdoptionTrackedAPIsByPlugin,
  ApiDeclaration,
  MissingApiItemMap,
  PluginApi,
  PluginOrPackage,
  ReferencedDeprecationsByPlugin,
  UnreferencedDeprecationsByPlugin,
} from './types';
import { removeBrokenLinks } from './utils';
import { AdoptionTrackedAPIStats } from './types';

export function getPluginApiMap(
  project: Project,
  plugins: PluginOrPackage[],
  log: ToolingLog,
  { collectReferences, pluginFilter }: { collectReferences: boolean; pluginFilter?: string[] }
): {
  pluginApiMap: { [key: string]: PluginApi };
  missingApiItems: MissingApiItemMap;
  referencedDeprecations: ReferencedDeprecationsByPlugin;
  unreferencedDeprecations: UnreferencedDeprecationsByPlugin;
  adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin;
} {
  log.debug('Building plugin API map, getting missing comments, and collecting deprecations...');
  const pluginApiMap: { [key: string]: PluginApi } = {};
  plugins.forEach((plugin) => {
    const captureReferences =
      collectReferences && (!pluginFilter || pluginFilter.indexOf(plugin.id) >= 0);
    pluginApiMap[plugin.id] = getPluginApi(project, plugin, plugins, log, captureReferences);
  });

  // Mapping of plugin id to the missing source API id to all the plugin API items that referenced this item.
  const missingApiItems: { [key: string]: { [key: string]: string[] } } = {};
  const referencedDeprecations: ReferencedDeprecationsByPlugin = {};
  const unreferencedDeprecations: UnreferencedDeprecationsByPlugin = {};
  const adoptionTrackedAPIs: AdoptionTrackedAPIsByPlugin = {};

  plugins.forEach((plugin) => {
    const id = plugin.id;
    const pluginApi = pluginApiMap[id];
    removeBrokenLinks(pluginApi, missingApiItems, pluginApiMap, log);
    collectDeprecations(pluginApi, referencedDeprecations, unreferencedDeprecations);
    collectAdoptionTrackedAPIs(pluginApi, adoptionTrackedAPIs);
  });
  return {
    pluginApiMap,
    missingApiItems,
    referencedDeprecations,
    unreferencedDeprecations,
    adoptionTrackedAPIs,
  };
}

function collectAdoptionTrackedAPIs(
  pluginApi: PluginApi,
  adoptionTrackedAPIsByPlugin: AdoptionTrackedAPIsByPlugin
) {
  adoptionTrackedAPIsByPlugin[pluginApi.id] = [];
  (['client', 'common', 'server'] as Array<'client' | 'server' | 'common'>).forEach((scope) => {
    pluginApi[scope].forEach((api) => {
      collectAdoptionForApi(api, adoptionTrackedAPIsByPlugin[pluginApi.id]);
    });
  });
}

function collectAdoptionForApi(
  api: ApiDeclaration,
  adoptionTrackedAPIs: AdoptionTrackedAPIStats[]
) {
  const { id, label, tags = [], children, references = [] } = api;
  if (tags.find((tag) => tag === 'track-adoption')) {
    const uniqueReferences = new Set<string>(references.map(({ plugin }) => plugin));
    adoptionTrackedAPIs.push({
      trackedApi: { id, label },
      references: [...uniqueReferences.values()],
    });
  }
  if (children) {
    children.forEach((child) => collectAdoptionForApi(child, adoptionTrackedAPIs));
  }
}

function collectDeprecations(
  pluginApi: PluginApi,
  referencedDeprecations: ReferencedDeprecationsByPlugin,
  unReferencedDeprecations: UnreferencedDeprecationsByPlugin
) {
  (['client', 'common', 'server'] as Array<'client' | 'server' | 'common'>).forEach((scope) => {
    pluginApi[scope].forEach((api) => {
      collectDeprecationsForApi(api, referencedDeprecations, unReferencedDeprecations);
    });
  });
}

function collectDeprecationsForApi(
  api: ApiDeclaration,
  referencedDeprecations: ReferencedDeprecationsByPlugin,
  unreferencedDeprecations: UnreferencedDeprecationsByPlugin
) {
  if ((api.tags || []).find((tag) => tag === 'deprecated')) {
    if (api.references && api.references.length > 0) {
      api.references.forEach((ref) => {
        if (referencedDeprecations[ref.plugin] === undefined) {
          referencedDeprecations[ref.plugin] = [];
        }
        referencedDeprecations[ref.plugin].push({
          ref,
          deprecatedApi: api,
        });
      });
    } else {
      if (unreferencedDeprecations[api.parentPluginId] === undefined) {
        unreferencedDeprecations[api.parentPluginId] = [];
      }
      unreferencedDeprecations[api.parentPluginId].push(api);
    }
  }
  if (api.children) {
    api.children.forEach((child) =>
      collectDeprecationsForApi(child, referencedDeprecations, unreferencedDeprecations)
    );
  }
}
