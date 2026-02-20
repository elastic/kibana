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

import globby from 'globby';

import { REPO_ROOT } from '@kbn/repo-info';
import { run } from '@kbn/dev-cli-runner';
import { getPackages } from '@kbn/repo-packages';
import { checkFileCasing } from './precommit_hook/check_file_casing';
import { IGNORE_PATTERNS, getExpectedCasing } from './precommit_hook/casing_check_config';

const RELATIVE_EXCEPTIONS_PATH = 'src/dev/precommit_hook/exceptions.json';
const EXCEPTIONS_JSON_PATH = join(REPO_ROOT, RELATIVE_EXCEPTIONS_PATH);

run(
  async ({ log, flagsReader }) => {
    const generateExceptions = flagsReader.boolean('generate-exceptions');

    const paths = await globby('**/*', {
      cwd: REPO_ROOT,
      onlyFiles: true,
      gitignore: true,
      ignore: IGNORE_PATTERNS,
    });

    const packages = getPackages(REPO_ROOT);
    const packageRootDirs = new Set(
      packages
        .filter((pkg) => !pkg.isPlugin())
        .map((pkg) => pkg.normalizedRepoRelativeDir.replace(/\\/g, '/'))
    );

    const rawExceptions: Record<string, Record<string, string>> = JSON.parse(
      readFileSync(EXCEPTIONS_JSON_PATH, 'utf8')
    );
    const exceptions: string[] = Object.values(rawExceptions).flatMap((teamObject) =>
      Object.keys(teamObject)
    );

    await checkFileCasing(log, paths, getExpectedCasing, {
      packageRootDirs,
      exceptions,
      generateExceptions,
    });
  },
  {
    flags: {
      boolean: ['generate-exceptions'],
      help: `
        --generate-exceptions  Collect current violations and append them to exceptions.json, then exit successfully.
      `,
    },
  }
);
