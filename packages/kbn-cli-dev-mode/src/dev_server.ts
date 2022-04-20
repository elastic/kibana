/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import {
  map,
  tap,
  take,
  share,
  mergeMap,
  switchMap,
  scan,
  takeUntil,
  ignoreElements,
} from 'rxjs/operators';
import { observeLines } from '@kbn/stdio-dev-helpers';

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
  private readonly phase$ = new Rx.ReplaySubject<'starting' | 'fatal exit' | 'listening'>(1);

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
    this.processExit$ = options.processExit$ ?? Rx.fromEvent<void>(process, 'exit');
    this.sigint$ = options.sigint$ ?? Rx.fromEvent<void>(process, 'SIGINT');
    this.sigterm$ = options.sigterm$ ?? Rx.fromEvent<void>(process, 'SIGTERM');
    this.mapLogLine = options.mapLogLine;
  }

  isReady$() {
    return this.ready$.asObservable();
  }

  getPhase$() {
    return this.phase$.asObservable();
  }

  /**
   * returns an observable of objects describing server start time.
   */
  getRestartTime$() {
    return this.phase$.pipe(
      scan((acc: undefined | { phase: string; time: number }, phase) => {
        if (phase === 'starting') {
          return { phase, time: Date.now() };
        }

        if (phase === 'listening' && acc?.phase === 'starting') {
          return { phase, time: Date.now() - acc.time };
        }

        return undefined;
      }, undefined),
      mergeMap((desc) => {
        if (desc?.phase !== 'listening') {
          return [];
        }

        return [{ ms: desc.time }];
      })
    );
  }

  /**
   * Run the Kibana server
   *
   * The observable will error if the child process fails to spawn for some reason, but if
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
    const gracefulShutdown$ = new Rx.Subject<void>();
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
        this.phase$.next('starting');
        this.ready$.next(false);

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
              this.phase$.next('fatal exit');
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
              this.phase$.next('listening');
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

    // complete state subjects when run$ completes
    subscriber.add(() => {
      this.phase$.complete();
      this.ready$.complete();
    });
  });
}
