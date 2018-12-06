/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

import { checkFiles } from './check_files';
import { File } from './file';
import { run } from './run';

run(log => {
  const files = process.argv.slice(2).map(path => new File(resolve(path)));
  return checkFiles(log, files);
});
