/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import { resolve } from 'path';
import globby from 'globby';
import execa from 'execa';
import chalk from 'chalk';
import { REPO_ROOT } from '@kbn/repo-info';

export interface LinterConfig {
  rootDir: string;
  sourceGlob: string;
}

export const lint = async (config: LinterConfig) => {
  const { rootDir, sourceGlob } = config;

  const sourceFilesGlob = resolve(rootDir, sourceGlob);
  const schemaPaths = await globby([sourceFilesGlob]);

  console.log(chalk.bold(`Linting API route schemas`));

  try {
    await execa(
      './node_modules/.bin/redocly',
      [
        'lint',
        '--config=packages/kbn-openapi-generator/redocly_linter/config.yaml',
        ...schemaPaths,
      ],
      {
        cwd: REPO_ROOT,
        stderr: process.stderr,
        stdout: process.stdout,
      }
    );
  } catch {
    throw new Error('Linter failed');
  }
};
