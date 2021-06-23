/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dirname, resolve } from 'path';
import { REPO_ROOT } from '../repo_root';

export const kibanaPackageJson = {
  __filename: resolve(REPO_ROOT, 'package.json'),
  __dirname: dirname(resolve(REPO_ROOT, 'package.json')),
  ...require(resolve(REPO_ROOT, 'package.json')),
};

export const isKibanaDistributable = () => {
  return kibanaPackageJson.build && kibanaPackageJson.build.distributable === true;
};
