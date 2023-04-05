/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import type { ChromeNavControl, ChromeNavControls } from '@kbn/core-chrome-browser';

/** @internal */
export class NavControlsService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start(): ChromeNavControls {
    const navControlsLeft$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsRight$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsCenter$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsExtension$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());

    return {
      // In the future, registration should be moved to the setup phase. This
      // is not possible until the legacy nav controls are no longer supported.
      registerLeft: (navControl: ChromeNavControl) =>
        navControlsLeft$.next(new Set([...navControlsLeft$.value.values(), navControl])),

      registerRight: (navControl: ChromeNavControl) =>
        navControlsRight$.next(new Set([...navControlsRight$.value.values(), navControl])),

      registerCenter: (navControl: ChromeNavControl) =>
        navControlsCenter$.next(new Set([...navControlsCenter$.value.values(), navControl])),

      registerExtension: (navControl: ChromeNavControl) =>
        navControlsExtension$.next(new Set([...navControlsExtension$.value.values(), navControl])),

      getLeft$: () =>
        navControlsLeft$.pipe(
          map((controls) => sortBy([...controls.values()], 'order')),
          takeUntil(this.stop$)
        ),
      getRight$: () =>
        navControlsRight$.pipe(
          map((controls) => sortBy([...controls.values()], 'order')),
          takeUntil(this.stop$)
        ),
      getCenter$: () =>
        navControlsCenter$.pipe(
          map((controls) => sortBy([...controls.values()], 'order')),
          takeUntil(this.stop$)
        ),
      getExtension$: () =>
        navControlsExtension$.pipe(
          map((controls) => sortBy([...controls.values()], 'order')),
          takeUntil(this.stop$)
        ),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
