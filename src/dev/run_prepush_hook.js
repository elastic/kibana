/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { simpleGit } from 'simple-git';

import { run } from '@kbn/dev-cli-runner';
import { createFlagError, combineErrors } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import * as Eslint from './eslint';
import { getFilesForCommit, checkFileCasing } from './precommit_hook';

run(
  async ({ log, flags }) => {
    process.env.IS_KIBANA_PREPUSH_HOOK = 'true';

    const git = simpleGit(REPO_ROOT);

    const { current } = await git.branchLocal();

    const commonAncestor = (await git.raw(['merge-base', 'origin/main', current])).trim();

    const changedFiles = (await git.diff(['--name-only', `${commonAncestor}..${current}`]))
      .split('\n')
      .filter(Boolean);

    console.log('foo', `${REPO_ROOT}/${changedFiles[0]}`);

    const changedFilesWithDiff = await Promise.all(
      changedFiles.map(async (file) => ({
        file: new File(`${REPO_ROOT}/${file}`),
        diff: await git.diff([`${commonAncestor}..${current}`, file]),
      }))
    );

    console.log('changedFilesWithDiff', changedFilesWithDiff);

    const errors = [];

    // check file casing
    try {
      await checkFileCasing(
        log,
        changedFilesWithDiff.map(({ file }) => file)
      );
    } catch (error) {
      errors.push(error);
    }

    if (errors.length) {
      throw combineErrors(errors);
    }

    throw new Error('test');
    /*
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

    // check file casing
    try {
      await checkFileCasing(log, files);
    } catch (error) {
      errors.push(error);
    }

    console.log('files', files);

    // check contents for i18n terms, if found run i18n check

    // run tsc on files

    // collect files to run tests on

    // Run ESLint
    for (const Linter of [Eslint]) {
      const filesToLint = await Linter.pickFilesToLint(log, files);
      if (filesToLint.length > 0) {
        try {
          await Linter.lintFiles(log, filesToLint, {
            fix: flags.fix,
          });

          if (flags.fix && flags.stage) {
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
    */
  },
  {
    description: `
    Run checks on files that have been changed in the current branch.
  `,
    flags: {
      boolean: ['fix', 'stage'],
      string: ['max-files', 'ref'],
      default: {
        fix: false,
        stage: true,
      },
      help: `
        --fix              Execute eslint in --fix mode
        --max-files        Max files number to check against. If exceeded the script will skip the execution
        --ref              Run checks against any git ref files (example HEAD or <commit_sha>) instead of running against staged ones
        --no-stage         By default when using --fix the changes are staged, use --no-stage to disable that behavior
      `,
    },
  }
);
