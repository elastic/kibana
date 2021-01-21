/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import globby from 'globby';

import { REPO_ROOT } from '@kbn/utils';
import { run } from '@kbn/dev-utils';
import { File } from './file';
import { checkFileCasing } from './precommit_hook/check_file_casing';

run(async ({ log }) => {
  const paths = await globby('**/*', {
    cwd: REPO_ROOT,
    nodir: true,
    gitignore: true,
    ignore: [
      // the gitignore: true option makes sure that we don't
      // include files from node_modules in the result, but it still
      // loads all of the files from node_modules before filtering
      // so it's still super slow. This prevents loading the files
      // and still relies on gitignore to to final ignores
      '**/node_modules',
    ],
  });

  const files = paths.map((path) => new File(path));

  await checkFileCasing(log, files);
});
