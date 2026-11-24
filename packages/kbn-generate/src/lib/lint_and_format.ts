/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';

import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { runOxfmt } from '@kbn/oxfmt';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Applies lint autofixes to the given absolute paths, then formats them with oxfmt.
 */
export const lintAndFormat = async (log: ToolingLog, paths: string[]): Promise<void> => {
  // Remaining lint errors are reported but don't abort the generator, which still has files to write.
  const { exitCode } = await execa(process.execPath, ['scripts/lint', '--fix', ...paths], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    reject: false,
  });
  if (exitCode !== 0) {
    log.warning(
      'Lint reported errors in the generated files that could not be fixed automatically'
    );
  }

  await runOxfmt(paths.map((path) => Path.relative(REPO_ROOT, path)));
};
