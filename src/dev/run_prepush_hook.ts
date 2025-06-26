/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';
import { createTests } from './preflight_check/create_tests';
import { getDiffedFilesForCurrentBranch } from './preflight_check/utils/get_diffed_files_for_current_branch';
import { checkIfBranchIsClean } from './preflight_check/utils/check_if_branch_is_clean';
import { renderTestSummary } from './preflight_check/utils/render_test_summary';
import { checkIfDiffedFilesExceedMaxFiles } from './preflight_check/utils/check_if_diffed_files_exceed_max_files';

run(
  async ({ log, flags }) => {
    const startTime = process.hrtime();

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

    const filesChangedSummaryTable = new Table({
      head: ['Files changed on this branch compared to origin/main:', 'Status'],
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      colWidths: [80, 10],
      wordWrap: true,
      wrapOnWordBoundary: false,
    });

    const diffedFiles = await getDiffedFilesForCurrentBranch();

    for (const { path, mode } of diffedFiles) {
      filesChangedSummaryTable.push([path, mode]);
    }

    if (!checkIfDiffedFilesExceedMaxFiles({ flags, files: diffedFiles, log })) {
      reportTime(runStartTime, 'total', {
        success: false,
      });

      throw new Error(
        'Bailing on preflight checks. You can skip preflight checks by running git push --no-verify.'
      );
    }

    log.info(`${filesChangedSummaryTable.toString()}\n`);

    await checkIfBranchIsClean({ log });

    const tests = await createTests({ diffedFiles, flags, log });

    log.info(`🐎 ${chalk.bold('Running preflight checks on your files...')}\n`);

    const checkResponses = await Promise.all(tests.map((test) => test.runCheck()));

    if (!checkResponses.some((checkResponse) => checkResponse?.errors.length)) {
      log.info(`🚀 ${chalk.bold('All preflight checks passed!')} ✨`);

      renderTestSummary({
        startTime,
        log,
        tests,
      });

      reportTime(runStartTime, 'total', {
        success: true,
      });
    } else {
      log.info(`${chalk.bold('Results')}`);

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

      renderTestSummary({
        startTime,
        log,
        tests,
      });

      reportTime(runStartTime, 'total', {
        success: false,
      });

      throw new Error('preflight checks failed.');
    }
  },
  {
    description: `Run checks on files that have been changed in your branch compared to origin/main.`,
    flags: {
      boolean: ['check-dependent-files', 'fix', 'show-file-set'],
      string: ['max-files'],
      default: {
        'check-dependent-files': false,
        fix: false,
        'max-files': 30,
        'show-file-set': false,
      },
      help: `
      --check-dependent-files   Also check files that import any of the changed files (dependents). Slower but more thorough.
      --fix                     Attempt to autofix problems.
      --max-files               Max files number to check against. If exceeded the script will skip the execution.
      --show-file-set           Show which files are being checked. Useful for debugging this script.
      `,
    },
  }
);
