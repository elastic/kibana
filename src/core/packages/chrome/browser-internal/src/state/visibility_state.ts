/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  combineLatest,
  distinctUntilChanged,
  fromEvent,
  map,
  merge,
  mergeMap,
  type Observable,
  of,
  shareReplay,
  startWith,
} from 'rxjs';
import { parse } from 'url';

import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import { createState } from './state_helpers';

export interface VisibilityStateDeps {
  application: InternalApplicationStart;
}

export interface VisibilityState {
  isVisible$: Observable<boolean>;
  setIsVisible: (isVisible: boolean) => void;
}

export const createVisibilityState = ({ application }: VisibilityStateDeps): VisibilityState => {
  // Start off the chrome service hidden if "embed" is in the hash query string.
  const isEmbedded = 'embed' in parse(location.hash.slice(1), true).query;
  const forceHidden = createState(isEmbedded);

  /** Emits true during printing (window.beforeprint), false otherwise. */
  const isPrinting$ = merge(
    fromEvent(window, 'beforeprint').pipe(map(() => true)),
    fromEvent(window, 'afterprint').pipe(map(() => false))
  ).pipe(startWith(false), distinctUntilChanged(), shareReplay(1));

  const appHidden$ = merge(
    // For the isVisible$ logic, having no mounted app is equivalent to having a hidden app
    // in the sense that the chrome UI should not be displayed until a non-chromeless app is mounting or mounted
    of(true),
    application.currentAppId$.pipe(
      mergeMap((appId) =>
        application.applications$.pipe(
          map((applications) => {
            return !!appId && applications.has(appId) && !!applications.get(appId)!.chromeless;
          })
        )
      )
    )
  );

  return {
    isVisible$: combineLatest([appHidden$, forceHidden.$, isPrinting$]).pipe(
      map(([appHidden, forceHiddenValue, isPrinting]) => {
        return !appHidden && !forceHiddenValue && !isPrinting;
      }),
      distinctUntilChanged(),
      shareReplay(1)
    ),
    setIsVisible: (isVisible: boolean) => forceHidden.set(!isVisible),
  };
};
