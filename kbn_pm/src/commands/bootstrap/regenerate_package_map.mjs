/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import Fsp from 'fs/promises';

import { convertPluginIdToPackageId } from '../../lib/plugins.mjs';
import { normalizePath } from '../../lib/normalize_path.mjs';
import { REPO_ROOT } from '../../lib/paths.mjs';

/**
 *
 * @param {import('@kbn/repo-packages').Package[]} packages
 * @param {import('@kbn/plugin-discovery').KibanaPlatformPlugin[]} plugins
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function regeneratePackageMap(packages, plugins, log) {
  const path = Path.resolve(REPO_ROOT, 'packages/kbn-repo-packages/package-map.json');
  const existingContent = Fs.existsSync(path) ? await Fsp.readFile(path, 'utf8') : undefined;

  /** @type {Array<[string, string]>} */
  const entries = [['@kbn/core', 'src/core']];

  for (const pkg of packages) {
    entries.push([pkg.manifest.id, pkg.normalizedRepoRelativeDir]);
  }

  for (const plugin of plugins) {
    entries.push([
      convertPluginIdToPackageId(plugin.manifest.id),
      normalizePath(Path.relative(REPO_ROOT, plugin.directory)),
    ]);
  }

  const content = JSON.stringify(
    entries.sort((a, b) => a[0].localeCompare(b[0])),
    null,
    2
  );

  if (content !== existingContent) {
    await Fsp.writeFile(path, content);
    log.warning('updated package map');
  }
}
