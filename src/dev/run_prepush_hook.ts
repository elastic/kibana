/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { existsSync } from 'node:fs';
import { simpleGit } from 'simple-git';
import cliProgress from 'cli-progress';
import chalk from 'chalk';
import Table from 'cli-table3';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { File } from './file';
import { checkFileCasing } from './preflight_check/check_file_casing';
import { checkTypescriptFiles } from './preflight_check/run_tsc';
import { runUnitTests } from './preflight_check/run_unit_tests';
import { esLintFiles } from './preflight_check/run_eslint';

const HASH_FOR_NULL_OR_DELETED_FILE = '00000000000';

function getDefaults(taskName: string) {
  const TASK_COL_LENGTH = 10;
  return {
    task: chalk.blue(taskName.padEnd(TASK_COL_LENGTH)),
    filename: '',
  };
}

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value != null;
}

run(
  async ({ log, flags }) => {
    const toolingLog = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });

    const runStartTime = Date.now();
    const reportTime = getTimeReporter(toolingLog, 'scripts/run_prepush_hook');

    process.env.IS_KIBANA_PREPUSH_HOOK = 'true';

    const git = simpleGit(REPO_ROOT);

    const checkTypes = ['i18n', 'tsc', 'eslint', 'jest', 'fileCasing'] as const;

    const checks = checkTypes.reduce((acc, check) => {
      acc[check] = {
        files: [],
      };

      return acc;
    }, {} as Record<typeof checkTypes[number], { files: Array<{ path: string; file: File }> }>);

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
      log.info(`${diffedFiles.length} files changed in this PR compared to upstream.\n`);
    } else {
      reportTime(runStartTime, 'total', {
        success: false,
      });

      log.error(
        `${diffedFiles.length} files changed in this PR compared to upstream and max files is set to ${flags['max-files']}.\n`
      );

      throw new Error(
        'Bailing on preflight checks. You can skip preflight checks by running git push --no-verify.'
      );
    }

    log.info(`${filesChangedSummaryTable.toString()}\n\n`);

    if (!(await git.branchLocal().status()).isClean()) {
      const warning = new Table({
        head: ['Warning: You have changes on your branch that are not committed or stashed!'],
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        colWidths: [80],
        wordWrap: true,
        wrapOnWordBoundary: true,
      });

      warning.push([
        `Preflight checks will be peformed on your files including these changes. 
This might influence the outcome of these tests.
`,
      ]);

      warning.push(['']);

      warning.push([
        'For the best results either commit your changes, stash them, or reset your branch to HEAD before running this script.',
      ]);

      log.info(warning.toString());
    }

    log.info('Running preflight checks on your files...\n');

    const multibar = new cliProgress.MultiBar(
      {
        clearOnComplete: false,
        hideCursor: false,
        fps: 60,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        format: '      {task} | {bar} | {value}/{total} | {filename}',
      },
      cliProgress.Presets.shades_grey
    );

    // add bars
    const barTypescript = multibar.create(0, 0, getDefaults('typescript'));
    const barUnitTests = multibar.create(0, 0, getDefaults('unit tests'));
    const barEslint = multibar.create(0, 0, getDefaults('eslint'));
    const barFilecase = multibar.create(0, 0, getDefaults('file case'));
    const barI18n = multibar.create(0, 0, getDefaults('i18n'));

    for (const { path, mode, removed = [] } of diffedFiles) {
      const match = path.match(/^(.+?)((\.test|\.stories)?(\.tsx?|\.jsx?))$/);

      const pathWithoutExt = match ? match[1] : undefined;
      const ext = match ? match[2] : undefined;

      // If the user added a file with a test, add it to the list of files to test.
      if (ext === '.test.ts' || ext === '.test.tsx') {
        checks.jest.files.push({ path, file: new File(path) });
        barUnitTests.setTotal(barUnitTests.getTotal() + 1);
      }

      // if a user removed a line that includes i18n.translate, we need to run i18n check.
      if (
        removed.find(
          (line) => line.includes('i18n.translate') || line.includes('<FormattedMessage')
        )
      ) {
        checks.i18n.files.push({ path, file: new File(path) });
        barI18n.setTotal(barI18n.getTotal() + 1);
      }

      // If the user has added a ts file, we need to run tsc and eslint on it.
      if (ext === '.ts' || ext === '.tsx') {
        checks.tsc.files.push({ path, file: new File(path) });
        barTypescript.setTotal(barTypescript.getTotal() + 1);

        checks.eslint.files.push({ path, file: new File(path) });
        barEslint.setTotal(barEslint.getTotal() + 1);

        // Lets see if there is a corresponding Storybook or unit test file
        // for this file and also add it to the list to be checked.
        const storiesPath = `${pathWithoutExt}.stories.${ext}`;
        if (existsSync(storiesPath)) {
          checks.eslint.files.push({ path: storiesPath, file: new File(storiesPath) });
          barEslint.setTotal(barEslint.getTotal() + 1);

          checks.tsc.files.push({ path: storiesPath, file: new File(storiesPath) });
          barTypescript.setTotal(barTypescript.getTotal() + 1);
        }

        const testPath = `${pathWithoutExt}.test.${ext}`;
        if (existsSync(testPath)) {
          checks.eslint.files.push({ path: testPath, file: new File(testPath) });
          barEslint.setTotal(barEslint.getTotal());

          checks.tsc.files.push({ path: testPath, file: new File(testPath) });
          barTypescript.setTotal(barTypescript.getTotal() + 1);

          checks.jest.files.push({ path: testPath, file: new File(testPath) });
          barUnitTests.setTotal(barUnitTests.getTotal() + 1);
        }
      }

      if (mode === 'new') {
        checks.fileCasing.files.push({ path, file: new File(path) });
        barFilecase.setTotal(barFilecase.getTotal() + 1);
      }
    }

    const checkSummaryTable = new Table({
      head: ['Test', 'Files'],
      colWidths: [15, 75],
    });

    for (const [check, { files }] of Object.entries(checks)) {
      if (files.length) {
        checkSummaryTable.push([check, files.map(({ path }) => path).join(`\n`)]);
      }
    }

    const checkResponses = await Promise.all([
      runUnitTests(checks.jest.files, barUnitTests),
      checkTypescriptFiles(checks.tsc.files, barTypescript),
      esLintFiles(
        checks.eslint.files,
        {
          fix: Boolean(flags.fix),
        },
        barEslint
      ),
      checkFileCasing(log, checks.fileCasing.files, barFilecase),
    ]);

    multibar.stop();

    if (checkResponses.some((checkResponse) => checkResponse?.length)) {
      log.info('Results');

      const [unitTestErrors, tscErrors, eslintErrors, fileCasingErrors] = checkResponses;

      const resultsSummaryTable = new Table({
        head: ['Check', 'Errors'],
        colWidths: [15, 120],
      });

      unitTestErrors?.forEach((error) => {
        resultsSummaryTable.push([chalk.blue('jest'), error]);
      });

      tscErrors?.forEach((error) => {
        resultsSummaryTable.push([chalk.blue('typescript'), error]);
      });

      eslintErrors?.forEach((error) => {
        resultsSummaryTable.push([chalk.blue('eslint'), error]);
      });

      fileCasingErrors?.forEach((error) => {
        resultsSummaryTable.push([chalk.blue('fileCasing'), error]);
      });

      log.info(`${resultsSummaryTable.toString()}\n\n`);

      reportTime(runStartTime, 'total', {
        success: false,
      });

      throw new Error('preflight checks failed.');
    } else {
      reportTime(runStartTime, 'total', {
        success: true,
      });

      log.info('All preflight checks passed! ✨\n');
    }
  },
  {
    description: `Run checks on files that have been changed in your branch compared to upstream.`,
    flags: {
      boolean: ['fix', 'ci'],
      string: ['max-files'],
      default: {
        fix: false,
        'max-files': 30,
        ci: false,
      },
      help: `
      --fix              Attempt to autofix problems
      --max-files        Max files number to check against. If exceeded the script will skip the execution
      `,
    },
  }
);
