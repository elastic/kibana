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
import { fromEvent, merge, map, toArray, takeUntil } from 'rxjs';
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
    const stdout$ = fromEvent<Buffer>(proc.stdout!, 'data').pipe(map((chunk) => chunk.toString()));
    const stderr$ = fromEvent<Buffer>(proc.stderr!, 'data').pipe(map((chunk) => chunk.toString()));
    const close$ = fromEvent(proc, 'close');

    await merge(stdout$, stderr$)
      .pipe(takeUntil(close$), toArray())
      .toPromise()
      .then((logs) => {
        log.info('---------- START LOG BUFFER\n\n');
        build.getLogBuffer().forEach(logFn);
        log.info('---------- END LOG BUFFER\n\n');
        if (logs?.length) {
          logs.forEach(logFn);
        }
      });
  } else {
    await watchStdioForLine(proc, logFn, exitAfter);
  }
}
