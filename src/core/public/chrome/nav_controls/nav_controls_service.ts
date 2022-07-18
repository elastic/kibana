/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { BehaviorSubject, ReplaySubject, Observable } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { MountPoint } from '../../types';

/** @public */
export interface ChromeNavControl {
  order?: number;
  mount: MountPoint;
}

/**
 * {@link ChromeNavControls | APIs} for registering new controls to be displayed in the navigation bar.
 *
 * @example
 * Register a left-side nav control rendered with React.
 * ```jsx
 * chrome.navControls.registerLeft({
 *   mount(targetDomElement) {
 *     ReactDOM.mount(<MyControl />, targetDomElement);
 *     return () => ReactDOM.unmountComponentAtNode(targetDomElement);
 *   }
 * })
 * ```
 *
 * @public
 */
export interface ChromeNavControls {
  /** Register a nav control to be presented on the bottom-left side of the chrome header. */
  registerLeft(navControl: ChromeNavControl): void;
  /** Register a nav control to be presented on the top-right side of the chrome header. */
  registerRight(navControl: ChromeNavControl): void;
  /** Register a nav control to be presented on the top-center side of the chrome header. */
  registerCenter(navControl: ChromeNavControl): void;
  /** @internal */
  getLeft$(): Observable<ChromeNavControl[]>;
  /** @internal */
  getRight$(): Observable<ChromeNavControl[]>;
  /** @internal */
  getCenter$(): Observable<ChromeNavControl[]>;
}

/** @internal */
export class NavControlsService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start() {
    const navControlsLeft$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsRight$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsCenter$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());

    return {
      // In the future, registration should be moved to the setup phase. This
      // is not possible until the legacy nav controls are no longer supported.
      registerLeft: (navControl: ChromeNavControl) =>
        navControlsLeft$.next(new Set([...navControlsLeft$.value.values(), navControl])),

      registerRight: (navControl: ChromeNavControl) =>
        navControlsRight$.next(new Set([...navControlsRight$.value.values(), navControl])),

      registerCenter: (navControl: ChromeNavControl) =>
        navControlsCenter$.next(new Set([...navControlsCenter$.value.values(), navControl])),

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
    };
  }

  public stop() {
    this.stop$.next();
  }
}
