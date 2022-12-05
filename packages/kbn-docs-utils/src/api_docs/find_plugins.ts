/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import globby from 'globby';

import loadJsonFile from 'load-json-file';

import { getPluginSearchPaths, simpleKibanaPlatformPluginDiscovery } from '@kbn/plugin-discovery';
import { REPO_ROOT } from '@kbn/repo-info';
import { ApiScope, PluginOrPackage } from './types';

export function findPlugins(): PluginOrPackage[] {
  const pluginSearchPaths = getPluginSearchPaths({
    rootDir: REPO_ROOT,
    oss: false,
    examples: false,
  });

  return (
    simpleKibanaPlatformPluginDiscovery(pluginSearchPaths, [
      // discover "core" as a plugin
      Path.resolve(REPO_ROOT, 'src/core'),
    ]).map((p) => ({ ...p, isPlugin: true, importPath: p.directory })) as PluginOrPackage[]
  ).concat(...findPackages());
}

/**
 * Helper to find packages.
 */
export function findPackages(): PluginOrPackage[] {
  const packagePaths = globby
    .sync(Path.resolve(REPO_ROOT, '{x-pack/,}packages/**/package.json'), { absolute: true })
    .map((path) =>
      // absolute paths returned from globby are using normalize or
      // something so the path separators are `/` even on windows,
      // Path.resolve solves this
      Path.resolve(path)
    );

  if (packagePaths.length === 0) {
    throw new Error('No packages found!');
  }

  return packagePaths.reduce<PluginOrPackage[]>((acc, path) => {
    const manifest: { name: string; author?: string; main?: string; browser?: string } =
      loadJsonFile.sync(path);
    if (manifest.name === undefined) return acc;

    let scope = ApiScope.COMMON;
    if (manifest.main && !manifest.browser) {
      scope = ApiScope.SERVER;
    } else if (manifest.browser && !manifest.main) {
      scope = ApiScope.CLIENT;
    }

    let ownerName = '[Owner missing]';
    // Some of these author fields have "<email@gmail.com>" in the name which mdx chokes on. Removing the < and > seems to work.
    if (Array.isArray(manifest.author)) {
      ownerName = manifest.author.map((d) => d.replace(/[<>]/gi, '')).join(', ');
    } else if (typeof manifest.author === 'string') {
      ownerName = manifest.author.replace(/[<>]/gi, '');
    }

    acc.push({
      directory: Path.dirname(path),
      manifestPath: path,
      manifest: {
        ...manifest,
        id: manifest.name,
        serviceFolders: [],
        owner: { name: ownerName },
      },
      isPlugin: false,
      scope,
    });
    return acc;
  }, [] as PluginOrPackage[]);
}
