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
import { SCRIPT_SOURCE } from './script_source';
import { PREPUSH_SCRIPT_SOURCE } from '../prepush_hook/script_source';
import { getGitDir, isCorrectGitVersionInstalled } from './git_utils';

const chmodAsync = promisify(chmod);
const writeFileAsync = promisify(writeFile);

async function installHook(
  gitDir: string,
  hookName: string,
  scriptSource: string,
  log: any
): Promise<void> {
  const installPath = Path.resolve(REPO_ROOT, gitDir, `hooks/${hookName}`);

  log.info(`Registering Kibana ${hookName} git hook...`);
  await writeFileAsync(installPath, scriptSource);
  await chmodAsync(installPath, 0o755);
  log.success(`Kibana ${hookName} git hook was installed successfully.`);
}

run(
  async ({ log, flagsReader }) => {
    try {
      if (!(await isCorrectGitVersionInstalled())) {
        throw createFailError(
          `We could not detect a git version in the required range. Please install a git version >= 2.5. Skipping Kibana git hook installation.`
        );
      }

      const gitDir = await getGitDir();

      const installPrecommit = flagsReader.boolean('precommit');
      const installPrepush = flagsReader.boolean('prepush');

      // If no specific hook is requested, install pre-commit by default (backward compatible)
      const installAll = !installPrecommit && !installPrepush;

      if (installAll || installPrecommit) {
        await installHook(gitDir, 'pre-commit', SCRIPT_SOURCE, log);
      }

      if (installAll || installPrepush) {
        await installHook(gitDir, 'pre-push', PREPUSH_SCRIPT_SOURCE, log);
      }
    } catch (e) {
      log.error(`Kibana git hook was not installed as an error occurred.`);
      throw e;
    }
  },
  {
    description: 'Register git hooks in the local repo',
    flags: {
      boolean: ['precommit', 'prepush'],
      default: {
        precommit: false,
        prepush: false,
      },
      help: `
        --precommit        Install only the pre-commit hook
        --prepush          Install only the pre-push hook
        
        If no flags are specified, both hooks are installed.
      `,
    },
  }
);
