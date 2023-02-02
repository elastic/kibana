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
import External from '../../lib/external_packages.js';

export async function regenerateBaseTsconfig() {
  const pkgMap = External['@kbn/repo-packages']().readPackageMap();
  const tsconfigPath = Path.resolve(REPO_ROOT, 'tsconfig.base.json');
  const lines = (await Fsp.readFile(tsconfigPath, 'utf-8')).split('\n');

  const start = lines.findIndex((l) => l.trim() === '// START AUTOMATED PACKAGE LISTING');
  const end = lines.findIndex((l) => l.trim() === '// END AUTOMATED PACKAGE LISTING');

  const current = await Fsp.readFile(tsconfigPath, 'utf8');
  const updated = [
    ...lines.slice(0, start + 1),
    ...Array.from(pkgMap.entries()).flatMap(([moduleId, repoRelPath]) => [
      `      "${moduleId}": ["${repoRelPath}"],`,
      `      "${moduleId}/*": ["${repoRelPath}/*"],`,
    ]),
    ...lines.slice(end),
  ].join('\n');

  if (updated !== current) {
    await Fsp.writeFile(tsconfigPath, updated);
  }
}
