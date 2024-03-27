/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';
import { promisify } from 'util';
import stripAnsi from 'strip-ansi';

import execa from 'execa';
import * as Rx from 'rxjs';
import { tap, share, take, mergeMap, map, ignoreElements, filter } from 'rxjs';
import chalk from 'chalk';
import treeKill from 'tree-kill';
import { ToolingLog } from '@kbn/tooling-log';
import { observeLines } from '@kbn/stdio-dev-helpers';
import { createFailError } from '@kbn/dev-cli-errors';

const treeKillAsync = promisify((...args: [number, string, any]) => treeKill(...args));

const SECOND = 1000;
const STOP_TIMEOUT = 30 * SECOND;

export interface ProcOptions {
  cmd: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  stdin?: string;
  writeLogsToPath?: string;
}

async function withTimeout(
  attempt: () => Promise<void>,
  ms: number,
  onTimeout: () => Promise<void>
) {
  await Rx.lastValueFrom(Rx.race(Rx.defer(attempt), Rx.timer(ms).pipe(Rx.mergeMap(onTimeout))));
}

export type Proc = ReturnType<typeof startProc>;

export function startProc(name: string, options: ProcOptions, log: ToolingLog) {
  const { cmd, args, cwd, env, stdin } = options;

  let stdioTarget: undefined | NodeJS.WritableStream;
  if (!options.writeLogsToPath) {
    log.info('starting [%s] > %s', name, cmd === process.execPath ? 'node' : cmd, args.join(' '));
  } else {
    stdioTarget = Fs.createWriteStream(options.writeLogsToPath, 'utf8');
    const exec = cmd === process.execPath ? 'node' : cmd;
    const relOut = Path.relative(process.cwd(), options.writeLogsToPath);
    log.info(`starting [${name}] and writing output to ${relOut} > ${exec} ${args.join(' ')}`);
  }

  // spawn fails with ENOENT when either the
  // cmd or cwd don't exist, so we check for the cwd
  // ahead of time so that the error is less ambiguous
  try {
    if (!Fs.statSync(cwd).isDirectory()) {
      throw new Error(`cwd "${cwd}" exists but is not a directory`);
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`cwd "${cwd}" does not exist`);
    }
  }

  const childProcess = execa(cmd, args, {
    cwd,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
    preferLocal: true,
  });

  if (stdin) {
    childProcess.stdin!.end(stdin, 'utf8'); // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdin will not be null
  } else {
    childProcess.stdin!.end(); // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdin will not be null
  }

  let stopCalled = false;

  const outcome$: Rx.Observable<number | null> = Rx.race(
    // observe first exit event
    Rx.fromEvent<[number, string]>(childProcess, 'exit').pipe(
      filter(([code]) => {
        if (stopCalled) {
          // when stop was already called, that's a graceful exit, let those events pass.
          return true;
        } else {
          // filtering out further interruption events to prevent `take()` from closing the stream.
          return code !== null;
        }
      }),
      take(1),
      map(([code]) => {
        if (stopCalled) {
          return null;
        }

        // JVM exits with 143 on SIGTERM and 130 on SIGINT, don't treat them as errors
        if (code > 0 && !(code === 143 || code === 130)) {
          throw createFailError(`[${name}] exited with code ${code}`, {
            exitCode: code,
          });
        }

        return code;
      })
    ),

    // observe first error event
    Rx.fromEvent(childProcess, 'error').pipe(
      take(1),
      mergeMap((err) => Rx.throwError(err))
    ),

    // observe a promise rejection
    Rx.from(childProcess).pipe(
      take(1),
      mergeMap((err) => Rx.throwError(err))
    )
  ).pipe(share());

  const lines$ = Rx.merge(
    observeLines(childProcess.stdout!), // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
    observeLines(childProcess.stderr!) // TypeScript note: As long as the proc stdio[1] is 'pipe', then stderr will not be null
  ).pipe(
    tap({
      next(line) {
        if (stdioTarget) {
          stdioTarget.write(stripAnsi(line) + '\n');
        } else {
          log.write(` ${chalk.gray('proc')} [${chalk.gray(name)}] ${line}`);
        }
      },
      complete() {
        if (stdioTarget) {
          stdioTarget.end();
        }
      },
    }),
    share()
  );

  const outcomePromise = Rx.firstValueFrom(Rx.merge(lines$.pipe(ignoreElements()), outcome$));

  async function stop(signal: NodeJS.Signals) {
    if (stopCalled) {
      return;
    }

    stopCalled = true;

    await withTimeout(
      async () => {
        log.debug(`Sending "${signal}" to proc "${name}"`);
        await treeKillAsync(childProcess.pid!, signal);
        await outcomePromise;
      },
      STOP_TIMEOUT,
      async () => {
        log.warning(
          `Proc "${name}" was sent "${signal}" didn't emit the "exit" or "error" events after ${STOP_TIMEOUT} ms, sending SIGKILL`
        );
        await treeKillAsync(childProcess.pid!, 'SIGKILL');
      }
    );

    await withTimeout(
      async () => {
        try {
          await outcomePromise;
        } catch (error) {
          // ignore
        }
      },
      STOP_TIMEOUT,
      async () => {
        throw new Error(
          `Proc "${name}" was stopped but never emitted either the "exit" or "error" event after ${STOP_TIMEOUT} ms`
        );
      }
    );
  }

  return {
    name,
    lines$,
    outcome$,
    outcomePromise,
    stop,
    stopWasCalled() {
      return stopCalled;
    },
  };
}
