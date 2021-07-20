/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';

import { ExecState, StopSignal, StopSubject } from './apm_server_installation';

export class ApmServerProcess {
  constructor(
    private readonly state$: Rx.BehaviorSubject<ExecState>,
    private readonly stop$: StopSubject
  ) {}

  toPromise() {
    return new Promise<void>((resolve, reject) => {
      const subscription = new Rx.Subscription();

      const state$ = this.state$.isStopped
        ? Rx.defer(() => Rx.of(this.state$.getValue()))
        : this.getState$();

      subscription.add(
        state$.subscribe({
          next: (state) => {
            switch (state.type) {
              case 'ready':
              case 'starting':
                // noop;
                break;

              case 'error':
                reject(state.error);
                subscription.unsubscribe();
                break;

              case 'killed':
                resolve();
                subscription.unsubscribe();
                break;

              case 'exitted':
                reject(new Error(`apm-server unexpectedly exitted with code [${state.exitCode}]`));
                subscription.unsubscribe();
                break;

              default:
                reject(new Error('unexpected state'));
                subscription.unsubscribe();
                break;
            }
          },
          error: (error) => {
            reject(error);
          },
          complete: () => {
            reject(new Error('ApmServerInstall state$ completed unexpectedly'));
          },
        })
      );
    });
  }

  getCurrentState() {
    return this.state$.getValue();
  }

  getState$() {
    return this.state$.asObservable();
  }

  stop(signal?: StopSignal) {
    this.stop$.next(signal);
  }
}
