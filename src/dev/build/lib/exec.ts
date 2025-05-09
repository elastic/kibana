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
  const bufferLogs = build && build?.getBufferLogs();

  if (bufferLogs) {
    build.pushToLogBuffer(`${chalk.dim('$')} ${cmd} ${args.join(' ')}`);
  } else {
    log[level](chalk.dim('$'), cmd, ...args);
  }

  const proc = execa(cmd, args, {
    cwd,
    env,
    preferLocal: true,
    ...(bufferLogs
      ? {
          stdio: ['ignore', 'pipe', 'pipe'],
          buffer: false,
        }
      : { stdio: ['ignore', 'pipe', 'pipe'] }),
  });

  const logFn = (line: string) => log[level](line);

  if (bufferLogs) {
    proc.stdout!.on('data', (chunk) => {
      build.pushToLogBuffer(chunk.toString());
    });

    proc.stderr!.on('data', (chunk) => {
      build.pushToLogBuffer(chunk.toString());
    });

    await new Promise<void>((resolve, reject) => {
      proc.on('close', () => {
        build.getLogBuffer().forEach(logFn);
        resolve();
      });
      proc.on('error', reject);
    });
  } else {
    await watchStdioForLine(proc, logFn, exitAfter);
  }
}
