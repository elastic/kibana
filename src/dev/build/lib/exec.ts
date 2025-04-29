/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import chalk from 'chalk';
import { ToolingLog, LogLevel } from '@kbn/tooling-log';

import { watchStdioForLine } from './watch_stdio_for_line';
import { Build } from './build';

interface Options {
  level?: Exclude<LogLevel, 'silent' | 'error'>;
  cwd?: string;
  env?: Record<string, string>;
  exitAfter?: RegExp;
  build?: Build;
}

export async function exec(
  log: ToolingLog,
  cmd: string,
  args: string[],
  { level = 'debug', cwd, env, exitAfter, build }: Options = {}
) {
  if (build?.getBufferLogs()) {
    build.pushToLogBuffer(`${chalk.dim('$')} ${cmd} ${args.join(' ')}`);
  } else {
    log[level](chalk.dim('$'), cmd, ...args);
  }

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
    env,
    preferLocal: true,
  });

  const logFn = (line: string) => log[level](line);

  await watchStdioForLine(proc, logFn, exitAfter, build);

  if (build?.getBufferLogs()) {
    build.getLogBuffer().forEach(logFn);
  }
}
