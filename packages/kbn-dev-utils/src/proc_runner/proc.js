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
import { gray } from 'chalk';

import treeKill from 'tree-kill';
import { promisify } from 'util';
const treeKillAsync = promisify(treeKill);

import { observeLines } from './observe_lines';
import { createCliError } from './errors';

const SECOND = 1000;
const STOP_TIMEOUT = 30 * SECOND;

async function withTimeout(attempt, ms, onTimeout) {
  const TIMEOUT = Symbol('timeout');
  try {
    await Promise.race([
      attempt(),
      new Promise((resolve, reject) => setTimeout(() => reject(TIMEOUT), STOP_TIMEOUT)),
    ]);
  } catch (error) {
    if (error === TIMEOUT) {
      await onTimeout();
    } else {
      throw error;
    }
  }
}

export function createProc(name, { cmd, args, cwd, env, stdin, log }) {
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
  });

  if (stdin) {
    childProcess.stdin.end(stdin, 'utf8');
  } else {
    childProcess.stdin.end();
  }

  return new class Proc {
    name = name;

    lines$ = Rx.merge(observeLines(childProcess.stdout), observeLines(childProcess.stderr)).pipe(
      tap(line => log.write(` ${gray('proc')} [${gray(name)}] ${line}`)),
      share()
    );

    outcome$ = Rx.defer(() => {
      // observe first exit event
      const exit$ = Rx.fromEvent(childProcess, 'exit').pipe(
        take(1),
        map(([code]) => {
          if (this._stopCalled) {
            return null;
          }
          // JVM exits with 143 on SIGTERM and 130 on SIGINT, dont' treat then as errors
          if (code > 0 && !(code === 143 || code === 130)) {
            throw createCliError(`[${name}] exited with code ${code}`);
          }

          return code;
        })
      );

      // observe first error event until there is a close event
      const error$ = Rx.fromEvent(childProcess, 'error').pipe(
        take(1),
        mergeMap(err => Rx.throwError(err))
      );

      return Rx.race(exit$, error$);
    }).pipe(share());

    _outcomePromise = Rx.merge(this.lines$.pipe(ignoreElements()), this.outcome$).toPromise();

    getOutcomePromise() {
      return this._outcomePromise;
    }

    _stopCalled = false;

    async stop(signal) {
      if (this._stopCalled) {
        return;
      }
      this._stopCalled = true;
      await withTimeout(
        async () => {
          log.debug(`Sending "${signal}" to proc "${name}"`);
          await treeKillAsync(childProcess.pid, signal);
          await this.getOutcomePromise();
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
            await this.getOutcomePromise();
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
  }();
}
