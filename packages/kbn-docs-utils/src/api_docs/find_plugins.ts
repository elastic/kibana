/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { getPluginSearchPaths } from '@kbn/config';
import { simpleKibanaPlatformPluginDiscovery, REPO_ROOT } from '@kbn/dev-utils';

export function findPlugins() {
  const pluginSearchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    oss: false,
    examples: false,
  });

  return simpleKibanaPlatformPluginDiscovery(pluginSearchPaths, [
    // discover "core" as a plugin
    Path.resolve(REPO_ROOT, 'src/core'),
  ]);
}
