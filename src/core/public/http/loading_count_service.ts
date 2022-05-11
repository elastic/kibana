/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import {
  distinctUntilChanged,
  endWith,
  map,
  pairwise,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { FatalErrorsSetup } from '../fatal_errors';
import { CoreService } from '../../types';

/** @public */
export interface LoadingCountSetup {
  addLoadingCountSource(countSource$: Observable<number>): void;

  getLoadingCount$(): Observable<number>;
}

/**
 * See {@link LoadingCountSetup}.
 * @public
 */
export type LoadingCountStart = LoadingCountSetup;

/** @internal */
export class LoadingCountService implements CoreService<LoadingCountSetup, LoadingCountStart> {
  private readonly stop$ = new Subject<void>();
  private readonly loadingCount$ = new BehaviorSubject(0);

  public setup({ fatalErrors }: { fatalErrors: FatalErrorsSetup }) {
    return {
      getLoadingCount$: () => this.loadingCount$.pipe(distinctUntilChanged()),
      addLoadingCountSource: (count$: Observable<number>) => {
        count$
          .pipe(
            distinctUntilChanged(),

            tap((count) => {
              if (count < 0) {
                throw new Error(
                  'Observables passed to loadingCount.add() must only emit positive numbers'
                );
              }
            }),

            // use takeUntil() so that we can finish each stream on stop() the same way we do when they complete,
            // by removing the previous count from the total
            takeUntil(this.stop$),
            endWith(0),
            startWith(0),
            pairwise(),
            map(([prev, next]) => next - prev)
          )
          .subscribe({
            next: (delta) => {
              this.loadingCount$.next(this.loadingCount$.getValue() + delta);
            },
            error: (error) => fatalErrors.add(error),
          });
      },
    };
  }

  public start({ fatalErrors }: { fatalErrors: FatalErrorsSetup }) {
    return this.setup({ fatalErrors });
  }

  public stop() {
    this.stop$.next();
    this.loadingCount$.complete();
  }
}
