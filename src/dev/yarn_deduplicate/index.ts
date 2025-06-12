/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { writeFileSync, readFileSync } from 'fs';
import { fixDuplicates } from 'yarn-deduplicate';
import { REPO_ROOT } from '@kbn/repo-info';

const yarnLockFile = resolve(REPO_ROOT, 'yarn.lock');
const yarnLock = readFileSync(yarnLockFile, 'utf-8');
const output = fixDuplicates(yarnLock, {
  useMostCommon: false,
  excludeScopes: ['@types'],
  excludePackages: ['axe-core', '@babel/types', 'csstype', 'yaml', 'zod'],
});

writeFileSync(yarnLockFile, output);
