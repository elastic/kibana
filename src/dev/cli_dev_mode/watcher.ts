/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import * as Rx from 'rxjs';
import {
  map,
  tap,
  takeUntil,
  count,
  share,
  buffer,
  debounceTime,
  ignoreElements,
} from 'rxjs/operators';
import Chokidar from 'chokidar';

import { Log } from './log';

export interface Options {
  enabled: boolean;
  log: Log;
  paths: string[];
  ignore: Array<string | RegExp>;
  cwd: string;
}

export class Watcher {
  public readonly enabled: boolean;

  private readonly log: Log;
  private readonly paths: string[];
  private readonly ignore: Array<string | RegExp>;
  private readonly cwd: string;

  private readonly restart$ = new Rx.Subject<void>();

  constructor(options: Options) {
    this.enabled = !!options.enabled;
    this.log = options.log;
    this.paths = options.paths;
    this.ignore = options.ignore;
    this.cwd = options.cwd;
  }

  run$ = new Rx.Observable((subscriber) => {
    if (!this.enabled) {
      this.restart$.complete();
      subscriber.complete();
      return;
    }

    const chokidar = Chokidar.watch(this.paths, {
      cwd: this.cwd,
      ignored: this.ignore,
    });

    subscriber.add(() => {
      chokidar.close();
    });

    const error$ = Rx.fromEvent(chokidar, 'error').pipe(
      map((error) => {
        throw error;
      })
    );

    const init$ = Rx.fromEvent(chokidar, 'add').pipe(
      takeUntil(Rx.fromEvent(chokidar, 'ready')),
      count(),
      tap((fileCount) => {
        this.log.good('watching for changes', `(${fileCount} files)`);
      })
    );

    const change$ = Rx.fromEvent<[string, string]>(chokidar, 'all').pipe(
      map(([, path]) => path),
      share()
    );

    subscriber.add(
      Rx.merge(
        error$,
        Rx.concat(
          init$,
          change$.pipe(
            buffer(change$.pipe(debounceTime(50))),
            map((changes) => {
              const paths = Array.from(new Set(changes));
              const prefix = paths.length > 1 ? '\n - ' : ' ';
              const fileList = paths.reduce((list, file) => `${list || ''}${prefix}"${file}"`, '');

              this.log.warn(`restarting server`, `due to changes in${fileList}`);
              this.restart$.next();
            })
          )
        )
      )
        .pipe(ignoreElements())
        .subscribe(subscriber)
    );
  });

  serverShouldRestart$() {
    return this.restart$.asObservable();
  }
}
