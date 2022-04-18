/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs/promises';
import Path from 'path';

import { KibanaPlatformPlugin } from '@kbn/plugin-discovery';
import { convertPluginIdToPackageId } from './convert_plugin_id_to_package_id';

export async function regenerateBaseTsconfig(plugins: KibanaPlatformPlugin[], repoRoot: string) {
  const tsconfigPath = Path.resolve(repoRoot, 'tsconfig.base.json');
  const lines = (await Fs.readFile(tsconfigPath, 'utf-8')).split('\n');

  const packageMap = plugins
    .slice()
    .sort((a, b) => a.manifestPath.localeCompare(b.manifestPath))
    .flatMap((p) => {
      const id = convertPluginIdToPackageId(p.manifest.id);
      const path = Path.relative(repoRoot, p.directory);
      return [`      "${id}": ["${path}"],`, `      "${id}/*": ["${path}/*"],`];
    });

  const start = lines.findIndex((l) => l.trim() === '// START AUTOMATED PACKAGE LISTING');
  const end = lines.findIndex((l) => l.trim() === '// END AUTOMATED PACKAGE LISTING');

  await Fs.writeFile(
    tsconfigPath,
    [...lines.slice(0, start + 1), ...packageMap, ...lines.slice(end)].join('\n')
  );
}
