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
import type { NextHeaderService } from '../services/next_header';

type NextHeaderStart = ReturnType<NextHeaderService['start']>;

export interface AppChangeHandlerDeps {
  currentAppId$: Observable<string | undefined>;
  stop$: Observable<void>;
  state: ChromeState;
  docTitle: ChromeDocTitle;
  nextHeader: NextHeaderStart;
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
  nextHeader,
}: AppChangeHandlerDeps): void {
  currentAppId$.pipe(takeUntil(stop$)).subscribe(() => {
    // Reset UI elements
    state.breadcrumbs.legacyBadge.set(undefined);
    state.appMenu.set(undefined);

    // Reset breadcrumbs
    state.breadcrumbs.classic.set([]);
    state.breadcrumbs.badges.set([]);

    // Reset help
    state.help.extension.set(undefined);

    // Reset document title
    docTitle.reset();

    // Reset Chrome-Next header config (AI button is global and not cleared here)
    nextHeader.reset();
  });
}
