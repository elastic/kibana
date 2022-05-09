/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { getPluginSearchPaths } from '@kbn/plugin-discovery';
import { KibanaPlatformPlugin, simpleKibanaPlatformPluginDiscovery } from '@kbn/plugin-discovery';

import { REPO_ROOT } from '@kbn/utils';

export interface SearchOptions {
  oss: boolean;
  examples: boolean;
  extraPluginScanDirs: string[];
}

export function findPlugins({
  oss,
  examples,
  extraPluginScanDirs,
}: SearchOptions): Map<string, KibanaPlatformPlugin> {
  const pluginSearchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    oss,
    examples,
  });

  for (const extraScanDir of extraPluginScanDirs) {
    if (!Path.isAbsolute(extraScanDir)) {
      throw new TypeError('extraPluginScanDirs must all be absolute paths');
    }
    pluginSearchPaths.push(extraScanDir);
  }

  const plugins = simpleKibanaPlatformPluginDiscovery(pluginSearchPaths, []);
  return new Map(plugins.map((p) => [p.manifest.id, p]));
}
