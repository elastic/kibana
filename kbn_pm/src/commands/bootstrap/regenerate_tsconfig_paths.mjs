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

import { REPO_ROOT } from '../../lib/paths.mjs';

/**
 * @param {string[]} tsconfigPaths
 * @param {import('@kbn/some-dev-log').SomeDevLog} log
 */
export async function regenerateTsconfigPaths(tsconfigPaths, log) {
  const path = Path.resolve(REPO_ROOT, 'packages/kbn-ts-projects/config-paths.json');
  const existingContent = Fs.existsSync(path) ? await Fsp.readFile(path, 'utf8') : undefined;

  const entries = [...tsconfigPaths]
    .map((abs) => Path.relative(REPO_ROOT, abs))
    .sort((a, b) => a.localeCompare(b));

  const content = JSON.stringify(entries, null, 2);
  if (content !== existingContent) {
    await Fsp.writeFile(path, content);
    log.warning('updated tsconfig.json paths');
  }
}
