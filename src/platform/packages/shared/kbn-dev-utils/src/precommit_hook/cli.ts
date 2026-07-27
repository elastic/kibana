/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { chmod, writeFile } from 'fs';
import { promisify } from 'util';
import { REPO_ROOT } from '@kbn/repo-info';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { SCRIPT_SOURCE, POST_CHECKOUT_SCRIPT_SOURCE } from './script_source';
import { getGitDir, isCorrectGitVersionInstalled } from './git_utils';

const chmodAsync = promisify(chmod);
const writeFileAsync = promisify(writeFile);

const HOOKS = [
  { name: 'pre-commit', source: SCRIPT_SOURCE },
  { name: 'post-checkout', source: POST_CHECKOUT_SCRIPT_SOURCE },
];

run(
  async ({ log }) => {
    try {
      if (!(await isCorrectGitVersionInstalled())) {
        throw createFailError(
          `We could not detect a git version in the required range. Please install a git version >= 2.5. Skipping Kibana git hook installation.`
        );
      }

      // getGitDir() resolves the shared (--git-common-dir) hooks location, so a
      // single install applies to every current and future git worktree.
      const gitDir = await getGitDir();

      for (const hook of HOOKS) {
        const installPath = Path.resolve(REPO_ROOT, gitDir, 'hooks', hook.name);

        log.info(`Registering Kibana ${hook.name} git hook...`);
        await writeFileAsync(installPath, hook.source);
        await chmodAsync(installPath, 0o755);
        log.success(`Kibana ${hook.name} git hook was installed successfully.`);
      }
    } catch (e) {
      log.error(`Kibana git hooks were not installed as an error occurred.`);
      throw e;
    }
  },
  {
    description: 'Register git hooks in the local repo',
  }
);
