/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import globby from 'globby';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';

function listPaths(filePaths: string[]) {
  return filePaths.map((filePath: string) => ` - ${filePath}`).join('\n');
}

run(async ({ log }) => {
  const filePaths = await globby('**/.prettierrc*', {
    cwd: REPO_ROOT,
    onlyFiles: true,
    gitignore: true,
    ignore: [
      // the gitignore: true option makes sure that we don't
      // include files from node_modules in the result, but it still
      // loads all of the files from node_modules before filtering
      // so it's still super slow. This prevents loading the files
      // and still relies on gitignore to final ignores
      '**/node_modules',
    ],
  });

  // const filePaths = paths.map((path) => (new File(path)).getRelativePath());

  if (!filePaths.length) {
    throw createFailError(`A top level .prettierrc file should exist and no file was found.`);
  }

  if (filePaths.length > 1) {
    throw createFailError(
      `Only a single .prettierrc root file should exist and more than one were found.\n${listPaths(
        filePaths
      )}`
    );
  }

  if (
    filePaths.length === 1 &&
    path.resolve(path.dirname(filePaths[0])) === path.resolve(REPO_ROOT)
  ) {
    log.success('Only one .prettierrc file found at the root level.');
  }

  process.exit(0);
});
