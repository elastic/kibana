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

import { EventEmitter } from 'events';

import execa from 'execa';
import * as Rx from 'rxjs';
import {
  map,
  tap,
  take,
  share,
  mergeMap,
  switchMap,
  takeUntil,
  ignoreElements,
} from 'rxjs/operators';
import { observeLines } from '@kbn/dev-utils';

import { usingServerProcess } from './using_server_process';
import { observeCompletion } from './observe_completion';
import { unsubAfter } from './unsub_after';

interface Options {
  script: string;
  argv: string[];
  gracefulTimeout: number;
  restart$: Rx.Observable<unknown>;
  parentExit$?: Rx.Observable<unknown>;
  sigint$?: Rx.Observable<unknown>;
  sigterm$?: Rx.Observable<unknown>;
}

export type DevServerState =
  | {
      type: 'msg';
      msg: string;
      proc: execa.ExecaChildProcess;
    }
  | {
      type: 'log';
      line: string;
    }
  | {
      type: 'exitted';
      code: number;
      timedOutAfter?: string;
      signal?: string;
    };

/**
 * Run the Kibana server with the given script and argv. The returned observable notifies
 * subscribers of the current state of the process with two types of State objects:
 *
 *   - { type: 'msg', msg: string, proc: execa.ExecaChildProcess }
 *     sent when the child process uses the `process.send([MSG_TYPE])` api
 *   - { type: 'exitted', code: number }
 *     sent when the child process exits, includes the exit code of the process
 *
 * The observable will error if the child process failes to spawn for some reason, but if
 * the child process is successfully spawned then the server will be run until it completes
 * and restarted when restart$ emits. In order to restart the server as quickly as possible
 * we kill it with SIGKILL and spawn the process again.
 *
 * While the process is running we also observe the SIGINT and SIGTERM signals and attempt
 * to gracefully exit the child process when they are received. If the process doesn't exit
 * within options.gracefulTimeout we kill the process with SIGKILL and complete our observable
 * which should allow the parent process to exit
 *
 * When the global 'exit' event is observed we send the SIGKILL signal to the child process
 * to make sure that it's immediately gone.
 */
export function observeDevServer({
  script,
  argv,
  gracefulTimeout,
  restart$,
  parentExit$ = Rx.fromEvent(process as EventEmitter, 'exit'),
  sigint$ = Rx.fromEvent(process as EventEmitter, 'SIGINT'),
  sigterm$ = Rx.fromEvent(process as EventEmitter, 'SIGTERM'),
}: Options) {
  return Rx.defer(() => {
    // emit this state to force unsubscription/killing the process
    const FORCE_UNSUB: DevServerState = {
      type: 'exitted',
      code: 0,
      signal: 'SIGKILL',
    };

    // signal that is sent to the worker in hopes of it shutting down gracefully
    const gracefulShutdown$ = new Rx.ReplaySubject(1);

    const state$ = Rx.concat([undefined], restart$).pipe(
      // on each tick unsubscribe from the previous server process
      // causing it to be SIGKILL-ed, then setup a new one
      switchMap(() =>
        usingServerProcess(script, argv, (proc) => {
          // observable which emits devServer states containing lines logged to stdout/stderr
          const log$ = Rx.merge(observeLines(proc.stdout!), observeLines(proc.stderr!)).pipe(
            map(
              (line): DevServerState => ({
                type: 'log',
                line,
              })
            )
          );

          // observable which emits exit states and is the switch which
          // ends all other merged observables
          const exit$ = Rx.fromEvent<[number, string | undefined]>(proc, 'exit').pipe(
            map(
              ([code, signal]): DevServerState => ({
                type: 'exitted',
                code: signal ? 0 : code,
                signal,
              })
            ),
            take(1),
            share()
          );

          // throw errors if spawn fails
          const error$ = Rx.fromEvent<Error>(proc, 'error').pipe(
            map((error) => {
              throw error;
            }),
            takeUntil(exit$)
          );

          // stream of messages received from the child process
          const msg$ = Rx.fromEvent<[any]>(proc, 'message').pipe(
            mergeMap(([msg]): DevServerState[] => {
              if (!Array.isArray(msg)) {
                return [];
              }

              return [
                {
                  type: 'msg',
                  msg: msg[0],
                  proc,
                },
              ];
            }),
            takeUntil(exit$)
          );

          // handle graceful shutdown requests
          const triggerGracefulShutdown$ = gracefulShutdown$.pipe(
            mergeMap(() => {
              // signal to the process that it should exit
              proc.kill('SIGINT');

              // if the timer fires before exit$ we will send SIGINT
              return Rx.timer(gracefulTimeout).pipe(
                map(
                  (): DevServerState => ({
                    type: 'exitted',
                    code: 0,
                    signal: 'SIGKILL',
                    timedOutAfter: 'SIGINT',
                  })
                )
              );
            }),

            // if exit$ emits before the gracefulTimeout then this
            // will unsub and cancel the timer
            takeUntil(exit$)
          );

          return Rx.merge(log$, exit$, error$, msg$, triggerGracefulShutdown$);
        })
      ),
      share()
    );

    // feed exit events from the environment into the shutdown signals
    const envExit$ = Rx.merge(
      // force shutdown for process.exit or SIGTERM
      Rx.merge(parentExit$, sigterm$).pipe(map(() => FORCE_UNSUB)),
      // trigger graceful shutdown for SIGINT
      sigint$.pipe(
        tap(() => gracefulShutdown$.next()),
        ignoreElements()
      )
    ).pipe(takeUntil(observeCompletion(state$)));

    return Rx.merge(state$, envExit$).pipe(
      // force unsubscription if we get a SIGKILL state, unsub tells the proc resource to kill the process
      unsubAfter((state) => state.type === 'exitted' && state.signal === 'SIGKILL')
    );
  });
}
