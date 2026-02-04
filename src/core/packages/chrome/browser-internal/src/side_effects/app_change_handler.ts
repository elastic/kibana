/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import { takeUntil } from 'rxjs';
import type { ChromeDocTitle } from '@kbn/core-chrome-browser';
import type { ChromeState } from '../state/chrome_state';

export interface AppChangeHandlerDeps {
  currentAppId$: Observable<string | undefined>;
  stop$: Observable<void>;
  state: ChromeState;
  docTitle: ChromeDocTitle;
}

/**
 * Resets per-app chrome state when navigating between applications.
 * Global chrome state is intentionally preserved across app changes.
 */
export function setupAppChangeHandler({
  currentAppId$,
  stop$,
  state,
  docTitle,
}: AppChangeHandlerDeps): void {
  currentAppId$.pipe(takeUntil(stop$)).subscribe(() => {
    // Reset UI elements
    state.badge.set(undefined);
    state.appMenu.set(undefined);

    // Reset breadcrumbs
    state.breadcrumbs.classic.set([]);
    state.breadcrumbs.badges.set([]);

    // Reset help
    state.help.extension.set(undefined);

    // Reset document title
    docTitle.reset();
  });
}
