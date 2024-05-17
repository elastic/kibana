/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { fixDuplicates } from 'yarn-deduplicate';

const yarnLockFile = resolve(REPO_ROOT, 'yarn.lock');
const yarnLock = readFileSync(yarnLockFile, 'utf-8');
const output = fixDuplicates(yarnLock, {
  useMostCommon: false,
  excludeScopes: ['@types'],
  excludePackages: ['axe-core', '@babel/types', 'csstype'],
});

writeFileSync(yarnLockFile, output);
