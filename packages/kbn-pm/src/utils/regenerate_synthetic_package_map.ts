/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import Path from 'path';

import normalizePath from 'normalize-path';
import { KibanaPlatformPlugin } from '@kbn/plugin-discovery';
import { convertPluginIdToPackageId } from './convert_plugin_id_to_package_id';

export async function regenerateSyntheticPackageMap(
  plugins: KibanaPlatformPlugin[],
  repoRoot: string
) {
  const entries: Array<[string, string]> = [['@kbn/core', 'src/core']];

  for (const plugin of plugins) {
    entries.push([
      convertPluginIdToPackageId(plugin.manifest.id),
      normalizePath(Path.relative(repoRoot, plugin.directory)),
    ]);
  }

  await Fs.writeFile(
    Path.resolve(repoRoot, 'packages/kbn-synthetic-package-map/synthetic-packages.json'),
    JSON.stringify(entries, null, 2)
  );
}
