/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortBy } from 'lodash';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
import { map, takeUntil } from 'rxjs';
import type {
  ChromeNavControl,
  ChromeNavControls,
  ChromeHelpMenuLink,
} from '@kbn/core-chrome-browser';

/** @internal */
export class NavControlsService {
  private readonly stop$ = new ReplaySubject<void>(1);

  public start(): ChromeNavControls {
    const navControlsLeft$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsRight$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsCenter$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const navControlsExtension$ = new BehaviorSubject<ReadonlySet<ChromeNavControl>>(new Set());
    const helpMenuLinks$ = new BehaviorSubject<ChromeHelpMenuLink[]>([]);

    function register(control$: BehaviorSubject<ReadonlySet<ChromeNavControl>>) {
      return (toAdd: ChromeNavControl) => {
        control$.next(new Set([...control$.getValue().values(), toAdd]));
      };
    }

    function unregister(control$: BehaviorSubject<ReadonlySet<ChromeNavControl>>) {
      return (toDelete: ChromeNavControl) => {
        const set = control$.getValue();
        if (!set.has(toDelete)) return;
        const clone = new Set(set);
        clone.delete(toDelete);
        control$.next(clone);
      };
    }

    return {
      registerLeft: register(navControlsLeft$),
      unregisterLeft: unregister(navControlsLeft$),

      registerRight: register(navControlsRight$),
      unregisterRight: unregister(navControlsRight$),

      registerCenter: register(navControlsCenter$),
      unregisterCenter: unregister(navControlsCenter$),

      registerExtension: register(navControlsExtension$),
      unregisterExtension: unregister(navControlsExtension$),

      setHelpMenuLinks: (links: ChromeHelpMenuLink[]) => {
        // This extension point is only intended to be used once by the cloud integration > cloud_links plugin
        if (helpMenuLinks$.value.length > 0) {
          throw new Error(`Help menu links have already been set`);
        }
        helpMenuLinks$.next(links);
      },

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
      getHelpMenuLinks$: () => helpMenuLinks$.pipe(takeUntil(this.stop$)),
    };
  }

  public stop() {
    this.stop$.next();
  }
}
