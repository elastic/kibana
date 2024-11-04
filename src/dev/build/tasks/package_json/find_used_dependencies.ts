/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import globby from 'globby';
import { ImportResolver } from '@kbn/import-resolver';
import { ImportLocator } from '@kbn/import-locator';
import { readPackageMap, Package, PluginPackage } from '@kbn/repo-packages';
import { findUsedNodeModules } from '@kbn/find-used-node-modules';

export async function findUsedDependencies(
  listedPkgDependencies: any,
  repoRoot: any,
  plugins: PluginPackage[]
) {
  const resolver = ImportResolver.create(
    repoRoot,
    Array.from(readPackageMap().values()).flatMap((repoRel) => {
      try {
        return Package.fromManifest(repoRoot, Path.resolve(repoRoot, repoRel, 'kibana.jsonc'));
      } catch (error) {
        if (error.code === 'ENOENT') {
          // ignore paths which weren't copied into the build
          return [];
        }

        throw error;
      }
    })
  );

  // Get the dependencies found searching through the server
  // side code entries that were provided
  const usedDeps = [
    // find all the node modules we actually use on the server, including the peerDependencies of our used node_modules which are used within those deps
    ...(await findUsedNodeModules({
      resolver,
      locator: new ImportLocator(),
      findUsedPeers: true,
      entryPaths: [
        ...plugins.flatMap((p) =>
          p.manifest.plugin.server
            ? Path.resolve(repoRoot, p.normalizedRepoRelativeDir, 'server/index.js')
            : []
        ),
        ...(await globby(
          [
            // main code entries
            'src/cli*/dist.js',
            // core entry
            'src/core/server/index.js',
            // entries that are loaded into the server with dynamic require() calls
            'src/plugins/vis_types/timelion/server/**/*.js',
          ],
          {
            cwd: repoRoot,
            ignore: ['**/public/**'],
            absolute: true,
          }
        )),
      ],
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
