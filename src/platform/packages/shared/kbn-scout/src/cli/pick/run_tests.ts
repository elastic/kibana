/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import Readline from 'readline';
import { stripVTControlCharacters } from 'util';
import chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { getPlaywrightLimitOptions } from '../../playwright/tags';
import type { Selection } from './pick_tests';
import type { ServersMode } from './servers';

const LOG_FILE = '.scout/logs/scout_pick.log';

// `run-tests` adds this for us; calling Playwright directly has to skip the same tests, or a
// local run would pick up tests that need attributes a local target doesn't declare, e.g. fips
const { grepInvert } = getPlaywrightLimitOptions([]);

const getCommand = (
  { config, specs, target, verbose, headed }: Selection,
  mode: ServersMode,
  onlyFailed: boolean
): string[] =>
  mode === 'running'
    ? [
        'node',
        'scripts/playwright',
        'test',
        ...specs,
        `--config=${config.path}`,
        '--project=local',
        `--grep=${target.playwrightTag}`,
        ...(grepInvert ? [`--grep-invert=${grepInvert}`] : []),
        ...(headed ? ['--headed'] : []),
        ...(onlyFailed ? ['--last-failed'] : []),
      ]
    : [
        'node',
        'scripts/scout',
        'run-tests',
        ...(verbose ? [] : ['--quiet']),
        `--arch=${target.arch}`,
        `--domain=${target.domain}`,
        ...(headed ? ['--headed'] : []),
        specs.length ? `--testFiles=${specs.join(',')}` : `--config=${config.path}`,
      ];

/** Shows only the Playwright output of run-tests and keeps the rest in a log file */
const runQuietly = async (command: string[]) => {
  const logFile = Path.resolve(REPO_ROOT, LOG_FILE);
  Fs.mkdirSync(Path.dirname(logFile), { recursive: true });
  const output = Fs.createWriteStream(logFile);
  const child = execa(command[0], command.slice(1), {
    all: true,
    reject: false,
    env: { FORCE_COLOR: '1' },
  });

  if (child.all) {
    Readline.createInterface({ input: child.all }).on('line', (line) => {
      const plain = stripVTControlCharacters(line);
      output.write(`${plain}\n`);
      // proc runner lines look like ` proc [playwright] <output>`, with colors around the names
      if (plain.includes('proc [playwright] ')) {
        process.stdout.write(`${line.slice(line.indexOf('] ', line.indexOf('playwright')) + 2)}\n`);
      } else if (plain.includes('ERROR')) {
        process.stdout.write(`${line}\n`);
      }
    });
  }

  const result = await child;
  output.end();
  return result;
};

export const runTests = async (
  log: ToolingLog,
  selection: Selection,
  mode: ServersMode,
  onlyFailed: boolean
) => {
  const command = getCommand(selection, mode, onlyFailed);
  log.write(`\n${chalk.cyan('▶')} ${command.join(' ')}\n`);

  // Ctrl+C reaches the tests too, so it stops them and keeps this session open
  const ignoreInterrupt = () => {};
  process.on('SIGINT', ignoreInterrupt);
  let result;
  try {
    if (mode === 'with-run' && !selection.verbose) {
      log.write(chalk.dim(`Starting servers, full output in ${LOG_FILE}\n`));
      result = await runQuietly(command);
    } else {
      result = await execa(command[0], command.slice(1), {
        stdio: 'inherit',
        reject: false,
        env: { SCOUT_LOG_LEVEL: selection.verbose ? 'debug' : 'quiet' },
      });
    }
  } finally {
    process.off('SIGINT', ignoreInterrupt);
  }

  const { exitCode, signal } = result;
  if (signal || exitCode === 130) {
    log.write(chalk.yellow.bold('\n■ Tests stopped\n'));
  } else if (exitCode === 0) {
    log.write(chalk.green.bold('\n✔ Tests passed\n'));
  } else {
    log.write(chalk.red.bold(`\n✖ Tests failed (exit code ${exitCode})\n`));
  }
  return exitCode ?? 1;
};
