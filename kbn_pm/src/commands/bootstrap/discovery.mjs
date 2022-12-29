/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { REPO_ROOT } from '../../lib/paths.mjs';

// we need to run these in order to generate the pkg map which is used by things
// like `@kbn/babel-register`, so we have to import the JS files directory and can't
// rely on `@kbn/babel-register`.

export async function packageDiscovery() {
  const { discoverBazelPackages } = await import(
    // eslint-disable-next-line @kbn/imports/uniform_imports
    '../../../../packages/kbn-bazel-packages/index.js'
  );

  return await discoverBazelPackages(REPO_ROOT);
}

export async function pluginDiscovery() {
  const { getPluginSearchPaths, simpleKibanaPlatformPluginDiscovery } = await import(
    // eslint-disable-next-line @kbn/imports/uniform_imports
    '../../../../packages/kbn-plugin-discovery/index.js'
  );

  const searchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    examples: true,
    oss: false,
    testPlugins: true,
  });

  return simpleKibanaPlatformPluginDiscovery(searchPaths, []);
}
