/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { REPO_ROOT } from '../repo_root';

export const kibanaPackageJSON = {
  __filename: resolve(REPO_ROOT, 'package.json'),
  __dirname: dirname(resolve(REPO_ROOT, 'package.json')),
  ...JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json')).toString()),
};
