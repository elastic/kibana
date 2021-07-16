/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Rx from 'rxjs';
import { take, mapTo, map, filter, takeUntil } from 'rxjs/operators';

const READY_STATE = Object.freeze({
  type: 'ready',
});

const STARTING_STATE = Object.freeze({
  type: 'starting',
});

type State = typeof READY_STATE | typeof STARTING_STATE;

export class ApmServerProcess {
  private readonly state$: Rx.BehaviorSubject<State>;

  constructor(
    error$: Rx.Observable<Error>,
    ready$: Rx.Observable<void>,
    private readonly stop$: Rx.Subject<void>
  ) {
    this.state$ = new Rx.BehaviorSubject<State>(STARTING_STATE);

    Rx.merge(
      ready$.pipe(take(1), mapTo(READY_STATE)),
      error$.pipe(
        map((error) => {
          throw error;
        })
      )
    )
      .pipe(takeUntil(this.stop$))
      .subscribe(this.state$);
  }

  getState$() {
    return this.state$.asObservable();
  }

  isReady$(): Rx.Observable<void> {
    return this.state$.pipe(
      filter((state) => state.type === 'ready'),
      mapTo(undefined)
    );
  }

  stop() {
    this.stop$.next();
  }
}
