/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import globby from 'globby';
import { ImportResolver } from '@kbn/import-resolver';
import { findUsedNodeModules } from '@kbn/find-used-node-modules';

export async function findUsedDependencies(listedPkgDependencies: any, baseDir: any) {
  // Define the entry points for the server code in order to
  // look for the server side dependencies
  const serverEntries = await globby(
    [
      // main code entries
      'src/cli*/dist.js',
      // core entry
      'src/core/server/index.js',
      // plugin entries
      'src/plugins/**/server/index.js',
      'x-pack/plugins/**/server/index.js',
      // entries that are loaded into the server with dynamic require() calls
      'src/plugins/vis_types/timelion/server/**/*.js',
    ],
    {
      cwd: baseDir,
      ignore: ['**/public/**'],
      absolute: true,
    }
  );

  const resolver = ImportResolver.create(baseDir);

  // Get the dependencies found searching through the server
  // side code entries that were provided
  const usedDeps = [
    // TODO: remove this once we get rid off @kbn/ui-framework, for now it isn't detectable as "used" so we hard code it
    '@kbn/ui-framework',
    // find all the node modules we actually use on the server, including the peerDependencies of our used node_modules which are used within those deps
    ...(await findUsedNodeModules({
      resolver,
      entryPaths: serverEntries,
      findUsedPeers: true,
    })),
  ];

  // only include dependencies in the package.json file that are already listed in the package.json dependencies
  const neededDeps: Record<string, string> = {};

  for (const dep of usedDeps) {
    const version = listedPkgDependencies[dep];
    if (version) {
      neededDeps[dep] = version;
    }
  }

  return neededDeps;
}
