/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import execa from 'execa';
import { statSync } from 'fs';

import * as Rx from 'rxjs';
import { tap, share, take, mergeMap, map, ignoreElements } from 'rxjs/operators';
import chalk from 'chalk';

import treeKill from 'tree-kill';
import { promisify } from 'util';
const treeKillAsync = promisify((...args: [number, string, any]) => treeKill(...args));

import { ToolingLog } from '../tooling_log';
import { observeLines } from './observe_lines';
import { createCliError } from './errors';

const SECOND = 1000;
const STOP_TIMEOUT = 30 * SECOND;

export interface ProcOptions {
  cmd: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  stdin?: string;
}

async function withTimeout(
  attempt: () => Promise<void>,
  ms: number,
  onTimeout: () => Promise<void>
) {
  const TIMEOUT = Symbol('timeout');
  try {
    await Promise.race([
      attempt(),
      new Promise((_, reject) => setTimeout(() => reject(TIMEOUT), ms)),
    ]);
  } catch (error) {
    if (error === TIMEOUT) {
      await onTimeout();
    } else {
      throw error;
    }
  }
}

export type Proc = ReturnType<typeof startProc>;

export function startProc(name: string, options: ProcOptions, log: ToolingLog) {
  const { cmd, args, cwd, env, stdin } = options;

  log.info('[%s] > %s', name, cmd, args.join(' '));

  // spawn fails with ENOENT when either the
  // cmd or cwd don't exist, so we check for the cwd
  // ahead of time so that the error is less ambiguous
  try {
    if (!statSync(cwd).isDirectory()) {
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
    childProcess.stdin.end(stdin, 'utf8');
  } else {
    childProcess.stdin.end();
  }

  let stopCalled = false;

  const outcome$: Rx.Observable<number | null> = Rx.race(
    // observe first exit event
    Rx.fromEvent<[number]>(childProcess, 'exit').pipe(
      take(1),
      map(([code]) => {
        if (stopCalled) {
          return null;
        }
        // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat then as errors
        if (code > 0 && !(code === 143 || code === 130)) {
          throw createCliError(`[${name}] exited with code ${code}`);
        }

        return code;
      })
    ),

    // observe first error event
    Rx.fromEvent(childProcess, 'error').pipe(
      take(1),
      mergeMap(err => Rx.throwError(err))
    )
  ).pipe(share());

  const lines$ = Rx.merge(
    observeLines(childProcess.stdout),
    observeLines(childProcess.stderr)
  ).pipe(
    tap(line => log.write(` ${chalk.gray('proc')} [${chalk.gray(name)}] ${line}`)),
    share()
  );

  const outcomePromise = Rx.merge(lines$.pipe(ignoreElements()), outcome$).toPromise();

  async function stop(signal: NodeJS.Signals) {
    if (stopCalled) {
      return;
    }

    stopCalled = true;

    await withTimeout(
      async () => {
        log.debug(`Sending "${signal}" to proc "${name}"`);
        await treeKillAsync(childProcess.pid, signal);
        await outcomePromise;
      },
      STOP_TIMEOUT,
      async () => {
        log.warning(
          `Proc "${name}" was sent "${signal}" didn't emit the "exit" or "error" events after ${STOP_TIMEOUT} ms, sending SIGKILL`
        );
        await treeKillAsync(childProcess.pid, 'SIGKILL');
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
  };
}
