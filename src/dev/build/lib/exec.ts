/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import execa from 'execa';
import chalk from 'chalk';
import { ToolingLog, LogLevel } from '@kbn/tooling-log';

import { watchStdioForLine } from './watch_stdio_for_line';

interface Options {
  level?: Exclude<LogLevel, 'silent' | 'error'>;
  cwd?: string;
  env?: Record<string, string>;
  exitAfter?: RegExp;
}

export async function exec(
  log: ToolingLog,
  cmd: string,
  args: string[],
  { level = 'debug', cwd, env, exitAfter }: Options = {}
) {
  log[level](chalk.dim('$'), cmd, ...args);

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
    env,
    preferLocal: true,
  });

  await watchStdioForLine(proc, (line) => log[level](line), exitAfter);
}
