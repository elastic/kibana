/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { getKibanaDir } from '../utils';
import { listChangedFiles } from './strategy_git';

const REPO_ROOT = getKibanaDir();

/** Resolves `moon`'s absolute path — run via `ts-node`, not yarn, so it's not on `PATH`. */
function getMoonBinPath(): string {
  const moonBinPath = path.resolve(REPO_ROOT, 'node_modules/.bin/moon');
  if (existsSync(moonBinPath)) {
    return moonBinPath;
  }

  return execSync('yarn --silent which moon', { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
}

/**
 * Affected Moon project IDs for the changes between `mergeBase` and `HEAD`.
 *
 * `changedFiles` goes to Moon on stdin rather than letting `--affected` derive it:
 * Moon unions the base diff with the local working tree, so files written by earlier
 * CI steps would count as changes and fan out through `--downstream deep`. Sharing the
 * git strategy's list keeps any remaining difference a real dependency-graph difference.
 */
export function getAffectedProjectsMoon(
  mergeBase: string,
  includeDownstream: boolean,
  changedFiles: readonly string[] = listChangedFiles({ mergeBase, commit: 'HEAD' })
): Set<string> {
  const downstreamFlag = includeDownstream ? '--downstream deep' : '';
  const command = `"${getMoonBinPath()}" query projects --affected ${downstreamFlag}`;

  const output = execSync(command, {
    cwd: REPO_ROOT,
    encoding: 'utf8' as const,
    maxBuffer: 30 * 1024 * 1024, // 30MB buffer
    timeout: 30000, // 30 seconds
    input: JSON.stringify({ files: [...changedFiles] }),
  });

  const result = JSON.parse(output);

  const packageIds = new Set<string>();
  if (result.projects && Array.isArray(result.projects)) {
    for (const project of result.projects) {
      if (project.id) {
        packageIds.add(project.id);
      }
    }
  }
  return packageIds;
}
