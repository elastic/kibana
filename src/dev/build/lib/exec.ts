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

interface LogLine {
  level: Exclude<LogLevel, 'silent'>;
  chunk: string;
}

const handleBufferChunk = (chunk: Buffer, level: LogLine['level']): LogLine => {
  return {
    level,
    chunk: chunk.toString().trim(),
  };
};

const outputBufferedLogs = (
  log: ToolingLog,
  build: Build,
  logBuildCmd: () => void,
  logs: LogLine[] | undefined,
  success: boolean
) => {
  log.write(`--- ${success ? '✅' : '❌'} ${build.getBuildDesc()}`);

  log.indent(4, () => {
    logBuildCmd();

    if (logs?.length) {
      logs.forEach((line) => log[line.level](line.chunk));
    }
  });
};

export async function exec(
  log: ToolingLog,
  cmd: string,
  args: string[],
  { level = 'debug', cwd, env, exitAfter, build }: Options = {}
) {
  const logBuildCmd = () => log[level](chalk.dim('$'), cmd, ...args);
  const bufferLogs = build && build?.getBufferLogs();

  const proc = execa(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd,
    env,
    preferLocal: true,
  });

  if (bufferLogs) {
    const isDockerBuild = cmd.startsWith('./build_docker');
    const stdout$ = fromEvent<Buffer>(proc.stdout!, 'data').pipe<LogLine>(
      map((chunk) => handleBufferChunk(chunk, level))
    );
    // docker build uses stderr as a normal output stream
    const stderr$ = fromEvent<Buffer>(proc.stderr!, 'data').pipe<LogLine>(
      map((chunk) => handleBufferChunk(chunk, isDockerBuild ? level : 'error'))
    );
    const close$ = fromEvent(proc, 'close');
    const logs = await merge(stdout$, stderr$).pipe(takeUntil(close$), toArray()).toPromise();
    await proc
      .then(() => {
        outputBufferedLogs(log, build, logBuildCmd, logs, true);
      })
      .catch((error) => {
        outputBufferedLogs(log, build, logBuildCmd, logs, false);
        throw error;
      });
  } else {
    logBuildCmd();

    await watchStdioForLine(proc, (line: string) => log[level](line), exitAfter);
  }
}
