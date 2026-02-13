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
  map,
  pairwise,
  startWith,
  takeUntil,
  type Observable,
} from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { ChromeStyle, ChromeUserBanner } from '@kbn/core-chrome-browser';

const SNAPSHOT_REGEX = /-snapshot/i;

export interface BodyClassesSideEffectDeps {
  kibanaVersion: string;
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  isVisible$: Observable<boolean>;
  chromeStyle$: Observable<ChromeStyle | undefined>;
  actionMenu$: Observable<MountPoint | undefined>;
  stop$: Observable<void>;
}

/** Updates body CSS classes based on chrome state changes. */
export const handleBodyClasses = ({
  kibanaVersion,
  headerBanner$,
  isVisible$,
  chromeStyle$,
  actionMenu$,
  stop$,
}: BodyClassesSideEffectDeps): void => {
  const areClassesEqual = (prev: string[], next: string[]) =>
    prev.length === next.length && prev.every((value, index) => value === next[index]);

  const getKbnVersionClass = () => {
    // we assume that the version is valid and has the form 'X.X.X'
    // strip out `SNAPSHOT` and reformat to 'X-X-X'
    const formattedVersionClass = kibanaVersion.replace(SNAPSHOT_REGEX, '').split('.').join('-');
    return `kbnVersion-${formattedVersionClass}`;
  };

  const body = document.body;

  combineLatest([headerBanner$, isVisible$, chromeStyle$, actionMenu$])
    .pipe(
      map(([headerBanner, isVisible, chromeStyleValue, actionMenu]) => {
        return [
          'kbnBody',
          headerBanner ? 'kbnBody--hasHeaderBanner' : 'kbnBody--noHeaderBanner',
          isVisible ? 'kbnBody--chromeVisible' : 'kbnBody--chromeHidden',
          chromeStyleValue === 'project' && actionMenu ? 'kbnBody--hasProjectActionMenu' : '',
          getKbnVersionClass(),
        ].filter((className) => Boolean(className));
      }),
      distinctUntilChanged(areClassesEqual),
      startWith<string[]>([]),
      pairwise(),
      takeUntil(stop$)
    )
    .subscribe(([previousClasses, newClasses]) => {
      body.classList.remove(...previousClasses);
      body.classList.add(...newClasses);
    });
};
