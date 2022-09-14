/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import { normalizePath } from './normalize_path.mjs';
import { REPO_ROOT } from '../../lib/paths.mjs';
import { convertPluginIdToPackageId } from './plugins.mjs';

/**
 * @param {import('@kbn/plugin-discovery').KibanaPlatformPlugin[]} plugins
 */
export async function regenerateSyntheticPackageMap(plugins) {
  /** @type {Array<[string, string]>} */
  const entries = [['@kbn/core', 'src/core']];

  for (const plugin of plugins) {
    entries.push([
      convertPluginIdToPackageId(plugin.manifest.id),
      normalizePath(Path.relative(REPO_ROOT, plugin.directory)),
    ]);
  }

  await Fsp.writeFile(
    Path.resolve(REPO_ROOT, 'packages/kbn-synthetic-package-map/synthetic-packages.json'),
    JSON.stringify(entries, null, 2)
  );
}
