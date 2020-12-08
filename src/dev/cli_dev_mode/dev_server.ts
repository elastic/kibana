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
import { Watcher } from './watcher';
import { Log } from './log';

export interface Options {
  log: Log;
  watcher: Watcher;
  script: string;
  argv: string[];
  gracefulTimeout: number;
  processExit$?: Rx.Observable<void>;
  sigint$?: Rx.Observable<void>;
  sigterm$?: Rx.Observable<void>;
  mapLogLine?: DevServer['mapLogLine'];
}

export class DevServer {
  private readonly log: Log;
  private readonly watcher: Watcher;

  private readonly processExit$: Rx.Observable<void>;
  private readonly sigint$: Rx.Observable<void>;
  private readonly sigterm$: Rx.Observable<void>;
  private readonly ready$ = new Rx.BehaviorSubject(false);

  private readonly script: string;
  private readonly argv: string[];
  private readonly gracefulTimeout: number;
  private readonly mapLogLine?: (line: string) => string | null;

  constructor(options: Options) {
    this.log = options.log;
    this.watcher = options.watcher;

    this.script = options.script;
    this.argv = options.argv;
    this.gracefulTimeout = options.gracefulTimeout;
    this.processExit$ = options.processExit$ ?? Rx.fromEvent(process as EventEmitter, 'exit');
    this.sigint$ = options.sigint$ ?? Rx.fromEvent(process as EventEmitter, 'SIGINT');
    this.sigterm$ = options.sigterm$ ?? Rx.fromEvent(process as EventEmitter, 'SIGTERM');
    this.mapLogLine = options.mapLogLine;
  }

  isReady$() {
    return this.ready$.asObservable();
  }

  /**
   * Run the Kibana server
   *
   * The observable will error if the child process failes to spawn for some reason, but if
   * the child process is successfully spawned then the server will be run until it completes
   * and restart when the watcher indicates it should. In order to restart the server as
   * quickly as possible we kill it with SIGKILL and spawn the process again.
   *
   * While the process is running we also observe SIGINT signals and forward them to the child
   * process. If the process doesn't exit within options.gracefulTimeout we kill the process
   * with SIGKILL and complete our observable which should allow the parent process to exit.
   *
   * When the global 'exit' event or SIGTERM is observed we send the SIGKILL signal to the
   * child process to make sure that it's immediately gone.
   */
  run$ = new Rx.Observable<void>((subscriber) => {
    // listen for SIGINT and forward to process if it's running, otherwise unsub
    const gracefulShutdown$ = new Rx.Subject();
    subscriber.add(
      this.sigint$
        .pipe(
          map((_, index) => {
            if (this.ready$.getValue() && index === 0) {
              gracefulShutdown$.next();
            } else {
              subscriber.complete();
            }
          })
        )
        .subscribe({
          error(error) {
            subscriber.error(error);
          },
        })
    );

    // force unsubscription/kill on process.exit or SIGTERM
    subscriber.add(
      Rx.merge(this.processExit$, this.sigterm$).subscribe(() => {
        subscriber.complete();
      })
    );

    const runServer = () =>
      usingServerProcess(this.script, this.argv, (proc) => {
        // observable which emits devServer states containing lines
        // logged to stdout/stderr, completes when stdio streams complete
        const log$ = Rx.merge(observeLines(proc.stdout!), observeLines(proc.stderr!)).pipe(
          tap((observedLine) => {
            const line = this.mapLogLine ? this.mapLogLine(observedLine) : observedLine;
            if (line !== null) {
              this.log.write(line);
            }
          })
        );

        // observable which emits exit states and is the switch which
        // ends all other merged observables
        const exit$ = Rx.fromEvent<[number]>(proc, 'exit').pipe(
          tap(([code]) => {
            this.ready$.next(false);

            if (code != null && code !== 0) {
              if (this.watcher.enabled) {
                this.log.bad(`server crashed`, 'with status code', code);
              } else {
                throw new Error(`server crashed with exit code [${code}]`);
              }
            }
          }),
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

        // handles messages received from the child process
        const msg$ = Rx.fromEvent<[any]>(proc, 'message').pipe(
          tap(([received]) => {
            if (!Array.isArray(received)) {
              return;
            }

            const msg = received[0];

            if (msg === 'SERVER_LISTENING') {
              this.ready$.next(true);
            }

            // TODO: remove this once Pier is done migrating log rotation to KP
            if (msg === 'RELOAD_LOGGING_CONFIG_FROM_SERVER_WORKER') {
              // When receive that event from server worker
              // forward a reloadLoggingConfig message to parent
              // and child proc. This is only used by LogRotator service
              // when the cluster mode is enabled
              process.emit('message' as any, { reloadLoggingConfig: true } as any);
              proc.send({ reloadLoggingConfig: true });
            }
          }),
          takeUntil(exit$)
        );

        // handle graceful shutdown requests
        const triggerGracefulShutdown$ = gracefulShutdown$.pipe(
          mergeMap(() => {
            // signal to the process that it should exit
            proc.kill('SIGINT');

            // if the timer fires before exit$ we will send SIGINT
            return Rx.timer(this.gracefulTimeout).pipe(
              tap(() => {
                this.log.warn(
                  `server didnt exit`,
                  `sent [SIGINT] to the server but it didn't exit within ${this.gracefulTimeout}ms, killing with SIGKILL`
                );

                proc.kill('SIGKILL');
              })
            );
          }),

          // if exit$ emits before the gracefulTimeout then this
          // will unsub and cancel the timer
          takeUntil(exit$)
        );

        return Rx.merge(log$, exit$, error$, msg$, triggerGracefulShutdown$);
      });

    subscriber.add(
      Rx.concat([undefined], this.watcher.serverShouldRestart$())
        .pipe(
          // on each tick unsubscribe from the previous server process
          // causing it to be SIGKILL-ed, then setup a new one
          switchMap(runServer),
          ignoreElements()
        )
        .subscribe(subscriber)
    );
  });
}
