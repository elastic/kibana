/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import { REPO_ROOT } from '@kbn/repo-info';
import { getPackages } from '@kbn/repo-packages';
import { checkFileCasing } from './check_file_casing';
import { IGNORE_PATTERNS, getExpectedCasing } from './casing_check_config';

const EXCEPTIONS_JSON_PATH = join(REPO_ROOT, 'src/dev/precommit_hook/exceptions.json');

export async function runFileCasingCheck(log, paths, options = {}) {
  const { generateExceptions = false } = options;

  const packages = getPackages(REPO_ROOT);
  const packageRootDirs = new Set(
    packages
      .filter((pkg) => !pkg.isPlugin())
      .map((pkg) => pkg.normalizedRepoRelativeDir.replace(/\\/g, '/'))
  );

  const rawExceptions = JSON.parse(readFileSync(EXCEPTIONS_JSON_PATH, 'utf8'));
  const exceptions = Object.values(rawExceptions).flatMap((teamObject) => Object.keys(teamObject));

  await checkFileCasing(log, paths, getExpectedCasing, {
    packageRootDirs,
    exceptions,
    generateExceptions,
    ignorePatterns: IGNORE_PATTERNS,
  });
}
