/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { REPO_ROOT } from '../../lib/paths.mjs';
import { convertPluginIdToPackageId } from './plugins.mjs';
import { normalizePath } from './normalize_path.mjs';

/**
 * @param {import('@kbn/bazel-packages').BazelPackage[]} packages
 * @param {import('@kbn/plugin-discovery').KibanaPlatformPlugin[]} plugins
 */
export async function regenerateBaseTsconfig(packages, plugins) {
  const tsconfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
  const lines = (await Fsp.readFile(tsconfigPath, 'utf-8')).split('\n');

  const packagesMap = packages
    .slice()
    .sort((a, b) => a.normalizedRepoRelativeDir.localeCompare(b.normalizedRepoRelativeDir))
    .flatMap((p) => {
      if (!p.pkg) {
        return [];
      }

      const id = p.pkg.name;
      const path = p.normalizedRepoRelativeDir;
      return [`      "${id}": ["${path}"],`, `      "${id}/*": ["${path}/*"],`];
    });

  const pluginsMap = plugins
    .slice()
    .sort((a, b) => a.manifestPath.localeCompare(b.manifestPath))
    .flatMap((p) => {
      const id = convertPluginIdToPackageId(p.manifest.id);
      const path = normalizePath(Path.relative(REPO_ROOT, p.directory));
      return [`      "${id}": ["${path}"],`, `      "${id}/*": ["${path}/*"],`];
    });

  const start = lines.findIndex((l) => l.trim() === '// START AUTOMATED PACKAGE LISTING');
  const end = lines.findIndex((l) => l.trim() === '// END AUTOMATED PACKAGE LISTING');

  const current = await Fsp.readFile(tsconfigPath, 'utf8');
  const updated = [
    ...lines.slice(0, start + 1),
    ...packagesMap,
    ...pluginsMap,
    ...lines.slice(end),
  ].join('\n');

  if (updated !== current) {
    await Fsp.writeFile(tsconfigPath, updated);
  }
}
