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
 * @param {import('@kbn/plugin-discovery').KibanaPlatformPlugin[]} plugins
 */
export async function regenerateBaseTsconfig(plugins) {
  const tsconfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
  const lines = (await Fsp.readFile(tsconfigPath, 'utf-8')).split('\n');

  const packageMap = plugins
    .slice()
    .sort((a, b) => a.manifestPath.localeCompare(b.manifestPath))
    .flatMap((p) => {
      const id = convertPluginIdToPackageId(p.manifest.id);
      const path = normalizePath(Path.relative(REPO_ROOT, p.directory));
      return [`      "${id}": ["${path}"],`, `      "${id}/*": ["${path}/*"],`];
    });

  const start = lines.findIndex((l) => l.trim() === '// START AUTOMATED PACKAGE LISTING');
  const end = lines.findIndex((l) => l.trim() === '// END AUTOMATED PACKAGE LISTING');

  await Fsp.writeFile(
    tsconfigPath,
    [...lines.slice(0, start + 1), ...packageMap, ...lines.slice(end)].join('\n')
  );
}
