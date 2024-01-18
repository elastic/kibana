/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync } from 'node:fs';
import { simpleGit } from 'simple-git';
import Table from 'cli-table3';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import chalk from 'chalk';
import { createTests } from './preflight_check/create_tests';
import { nonNullable } from './preflight_check/utils/non_nullable';

const HASH_FOR_NULL_OR_DELETED_FILE = '00000000000';

run(
  async ({ log, flags }) => {
    const toolingLog = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    log.info(`✅ ${chalk.bold('Preflight Checks')}`);
    log.info(
      `This will check files for frequently occuring problems. You can always skip this check by running git push --no-verify.\n`
    );

    const runStartTime = Date.now();
    const reportTime = getTimeReporter(toolingLog, 'scripts/run_prepush_hook');

    process.env.IS_KIBANA_PREPUSH_HOOK = 'true';

    const git = simpleGit(REPO_ROOT);

    const { current } = await git.branchLocal();

    const commonAncestor = (await git.raw(['merge-base', 'origin/main', current])).trim();

    const diff = await git.diff([`${commonAncestor}..${current}`]);

    const filesChangedSummaryTable = new Table({
      head: ['Files changed in this PR compared to upstream:', 'Status'],
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      colWidths: [80, 10],
      wordWrap: true,
      wrapOnWordBoundary: false,
    });

    const diffedFiles = diff
      .split('diff --git')
      .filter(Boolean)
      .map((file) => {
        const path = String(file.split(' b/')[1]).split('\n')[0];
        if (!existsSync(path)) return undefined;

        const [firstHash, secondHash] = String(file.split('index ')[1]).split('\n')[0].split('..');
        const hunk = file.split(/@@ -[0-9]+,[0-9]+ \+[0-9]+,[0-9]+ @@/g)[1];

        const mode =
          firstHash === HASH_FOR_NULL_OR_DELETED_FILE
            ? 'new'
            : secondHash === HASH_FOR_NULL_OR_DELETED_FILE
            ? 'deleted'
            : 'modified';

        filesChangedSummaryTable.push([path, mode]);

        return {
          path,
          hunk,
          mode,
          added: hunk?.split('\n').filter((line) => line.startsWith('+')),
          removed: hunk?.split('\n').filter((line) => line.startsWith('-')),
        };
      })
      .filter(nonNullable);

    if (diffedFiles.length <= Number(flags['max-files'])) {
      log.info(
        `🔎 ${chalk.bold.blue(
          `${diffedFiles.length} committed files changed`
        )} on this branch compared to upstream.\n`
      );
    } else {
      reportTime(runStartTime, 'total', {
        success: false,
      });

      log.error(
        `❌ ${diffedFiles.length} committed files changed on this branch compared to upstream and max files is set to ${flags['max-files']}.\n`
      );

      throw new Error(
        'Bailing on preflight checks. You can skip preflight checks by running git push --no-verify.'
      );
    }

    log.info(`${filesChangedSummaryTable.toString()}\n`);

    if (!(await git.branchLocal().status()).isClean()) {
      const warning = new Table({
        head: ['Warning: You have changes on your branch that are not committed or stashed!'],
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        colWidths: [80],
        wordWrap: true,
        wrapOnWordBoundary: true,
      });

      warning.push([
        `Preflight checks will be performed on your files including these changes. 
This might influence the outcome of these tests.
`,
      ]);

      warning.push(['']);

      warning.push([
        'The checks will still run, but for the most accurate results either commit your changes, stash them, or reset your branch to HEAD before running this script.',
      ]);

      log.warning(`${warning.toString()}\n`);
    }

    const tests = await createTests({ diffedFiles, flags, log });

    log.info('🐎 Running preflight checks on your files...\n');

    const checkResponses = await Promise.all(tests.map((test) => test.runCheck()));

    if (checkResponses.some((checkResponse) => checkResponse?.errors.length)) {
      log.info('Results');

      const resultsSummaryTable = new Table({
        head: ['Check', 'Errors'],
        colWidths: [15, 120],
        wordWrap: true,
        wrapOnWordBoundary: false,
      });

      for (const checkResponse of checkResponses) {
        if (checkResponse?.errors.length) {
          resultsSummaryTable.push([checkResponse.test, checkResponse.errors.join('\n')]);
        }
      }

      log.info(`${resultsSummaryTable.toString()}\n\n`);

      reportTime(runStartTime, 'total', {
        success: false,
      });

      throw new Error('preflight checks failed.');
    } else {
      reportTime(runStartTime, 'total', {
        success: true,
      });

      log.info('🚀 All preflight checks passed! ✨\n');
    }
  },
  {
    description: `Run checks on files that have been changed in your branch compared to upstream.`,
    flags: {
      boolean: ['fix', 'show-file-set'],
      string: ['max-files', 'depth'],
      default: {
        depth: 2,
        fix: false,
        'max-files': 30,
        'show-file-set': true,
      },
      help: `
      --depth            Max depth of related files to check against. If exceeded the script will skip the execution
      --fix              Attempt to autofix problems
      --max-files        Max files number to check against. If exceeded the script will skip the execution
      --show-file-set    Show which files are being checked
      `,
    },
  }
);
