/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import * as Eslint from './eslint';
import * as Stylelint from './stylelint';
import {
  LinterCheck,
  YamlLintCheck,
  FileCasingCheck,
  MoonConfigGenerationCheck,
  getFilesForCommit,
} from './precommit_hook';

const PRECOMMIT_CHECKS = [
  new FileCasingCheck(),
  new LinterCheck('ESLint', Eslint),
  new LinterCheck('StyleLint', Stylelint),
  new YamlLintCheck(),
  new MoonConfigGenerationCheck(),
];

run(
  async ({ log, flags }) => {
    process.env.IS_KIBANA_PRECOMIT_HOOK = 'true';

    const allFiles = await getFilesForCommit(flags.ref);
    const files = allFiles.filter((f) => f.getGitStatus() !== 'deleted');
    const deletedFiles = allFiles.filter((f) => f.getGitStatus() === 'deleted');

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

    log.verbose('Running pre-commit checks...');
    const checksToRun = PRECOMMIT_CHECKS.filter((check) =>
      check.shouldExecute({
        files,
        deletedFiles,
        fix: flags.fix,
        flags: flags._,
      })
    );

    const results = await Promise.all(
      checksToRun.map(async (check) => {
        log.verbose(`Starting ${check.name}...`);
        const startTime = Date.now();
        const result = await check.runSafely(log, allFiles, {
          fix: flags.fix,
          stage: flags.stage,
        });
        const duration = Date.now() - startTime;
        log.verbose(`${check.name} completed in ${duration}ms`);
        return result;
      })
    );
    const failedChecks = results.filter((result) => !result.succeeded);

    if (failedChecks.length > 0) {
      const errorReport = [
        '\nPre-commit checks failed:',
        ...results.map((result) => result.toString()),
        '\nPlease fix the above issues before committing.',
      ].join('\n');

      throw new Error(errorReport);
    }

    log.success('All pre-commit checks passed!');
  },
  {
    description: `
    Run checks on files that are staged for commit by default
  `,
    flags: {
      boolean: ['fix', 'stage'],
      string: ['max-files', 'ref'],
      default: {
        fix: false,
        stage: true,
      },
      help: `
        --fix              Execute checks with possible fixes
        --max-files        Max files number to check against. If exceeded the script will skip the execution
        --ref              Run checks against any git ref files (example HEAD or <commit_sha>) instead of running against staged ones
        --no-stage         By default when using --fix the changes are staged, use --no-stage to disable that behavior
      `,
    },
  }
);
