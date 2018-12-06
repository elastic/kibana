/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import globby from 'globby';

import { checkFiles } from './check_files';
import { File } from './file';
import { run } from './run';

run(async log => {
  const paths = await globby(['**/*', '!**/node_modules/**'], {
    cwd: resolve(__dirname, '../../'),
  });

  return checkFiles(log, paths.map(path => new File(path)));
});
