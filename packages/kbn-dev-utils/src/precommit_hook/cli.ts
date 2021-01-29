/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';
import { chmod, writeFile } from 'fs';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/utils';

import { run } from '../run';
import { createFailError } from '../run';
import { SCRIPT_SOURCE } from './script_source';
import { getGitDir, isCorrectGitVersionInstalled } from './git_utils';

const chmodAsync = promisify(chmod);
const writeFileAsync = promisify(writeFile);

run(
  async ({ log }) => {
    try {
      if (!(await isCorrectGitVersionInstalled())) {
        throw createFailError(
          `We could not detect a git version in the required range. Please install a git version >= 2.5. Skipping Kibana pre-commit git hook installation.`
        );
      }

      const gitDir = await getGitDir();
      const installPath = Path.resolve(REPO_ROOT, gitDir, 'hooks/pre-commit');

      log.info(`Registering Kibana pre-commit git hook...`);
      await writeFileAsync(installPath, SCRIPT_SOURCE);
      await chmodAsync(installPath, 0o755);
      log.success(`Kibana pre-commit git hook was installed successfully.`);
    } catch (e) {
      log.error(`Kibana pre-commit git hook was not installed as an error occur.`);
      throw e;
    }
  },
  {
    description: 'Register git hooks in the local repo',
  }
);
