/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { snakeCase } from 'lodash';
import { PluginPackageManifest } from '@kbn/repo-packages';
import { PluginManifest } from '@kbn/core-plugins-server';
import { PluginType } from '@kbn/core-base-common';

export function pluginManifestFromPluginPackage(
  kibanaVersion: string,
  manifest: PluginPackageManifest
): PluginManifest {
  return {
    type: manifest.plugin.type === 'preboot' ? PluginType.preboot : PluginType.standard,
    id: manifest.plugin.id,
    version: '1.0.0',
    enabledOnAnonymousPages: manifest.plugin.enabledOnAnonymousPages,
    serviceFolders: manifest.serviceFolders,
    kibanaVersion,
    optionalPlugins: manifest.plugin.optionalPlugins ?? [],
    requiredBundles: manifest.plugin.requiredBundles ?? [],
    requiredPlugins: manifest.plugin.requiredPlugins ?? [],
    runtimePluginDependencies: manifest.plugin.runtimePluginDependencies ?? [],
    owner: {
      name: manifest.owner.join(' & '),
    },
    server: manifest.plugin.server,
    ui: manifest.plugin.browser,
    configPath: manifest.plugin.configPath ?? snakeCase(manifest.plugin.id),
  };
}
