/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import SimpleGit from 'simple-git/promise';

import { run, combineErrors, createFlagError } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import * as Eslint from './eslint';
import * as Stylelint from './stylelint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(
  async ({ log, flags }) => {
    const files = await getFilesForCommit(flags.ref);
    const errors = [];

    const maxFilesCount = flags['max-files']
      ? Number.parseInt(String(flags['max-files']), 10)
      : undefined;
    if (maxFilesCount !== undefined && (!Number.isFinite(maxFilesCount) || maxFilesCount < 1)) {
      throw createFlagError('expected --max-files to be a number greater than 0');
    }

    if (maxFilesCount && files.length > maxFilesCount) {
      log.warning(
        `--max-files is set to ${maxFilesCount} and ${files.length} were discovered. The current script execution will be skipped.`
      );
      return;
    }

    try {
      await checkFileCasing(log, files);
    } catch (error) {
      errors.push(error);
    }

    for (const Linter of [Eslint, Stylelint]) {
      const filesToLint = Linter.pickFilesToLint(log, files);
      if (filesToLint.length > 0) {
        try {
          await Linter.lintFiles(log, filesToLint, {
            fix: flags.fix,
          });

          if (flags.fix) {
            const simpleGit = new SimpleGit(REPO_ROOT);
            await simpleGit.add(filesToLint);
          }
        } catch (error) {
          errors.push(error);
        }
      }
    }

    if (errors.length) {
      throw combineErrors(errors);
    }
  },
  {
    description: `
    Run checks on files that are staged for commit by default
  `,
    flags: {
      boolean: ['fix'],
      string: ['max-files', 'ref'],
      default: {
        fix: false,
      },
      help: `
      --fix              Execute eslint in --fix mode
      --max-files        Max files number to check against. If exceeded the script will skip the execution
      --ref              Run checks against any git ref files (example HEAD or <commit_sha>) instead of running against staged ones
    `,
    },
  }
);
