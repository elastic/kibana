/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable, shareReplay } from 'rxjs';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeRecentlyAccessedHistoryItem,
  ChromeUserBanner,
} from '@kbn/core-chrome-browser';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';

export type ChromeStore = ChromeState;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ChromeState = {
  badge$: Observable<ChromeBadge | undefined>;
  breadcrumbs$: BehaviorSubject<ChromeBreadcrumb[]>;
  breadcrumbsAppendExtensions$: BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>;
  chromeStyle$: Observable<'classic' | 'project'>;
  customBranding$: Observable<CustomBranding>;
  customNavLink$: Observable<ChromeNavLink | undefined>;
  currentAppId$: Observable<string | undefined>;
  currentActionMenu$: Observable<MountPoint | undefined>;
  globalHelpExtensionMenuLinks$: BehaviorSubject<ChromeGlobalHelpExtensionMenuLink[]>;
  headerBanner$: Observable<ChromeUserBanner | undefined>;
  helpExtension$: Observable<ChromeHelpExtension | undefined>;
  helpMenuLinks$: Observable<ChromeHelpMenuLink[]>;
  helpSupportUrl$: BehaviorSubject<string>;
  isVisible$: Observable<boolean>;
  loadingCount$: Observable<number>;
  navControlsCenter$: Observable<ChromeNavControl[]>;
  navControlsExtension$: Observable<ChromeNavControl[]>;
  navControlsLeft$: Observable<ChromeNavControl[]>;
  navControlsRight$: Observable<ChromeNavControl[]>;
  navLinks$: Observable<ChromeNavLink[]>;
  recentlyAccessed$: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  projectBreadcrumbs$: Observable<ChromeBreadcrumb[]>;
  isSideNavCollapsed$: Observable<boolean>;
  homeHref$: Observable<string | undefined>;
};

export function createChromeStore(state: ChromeState): ChromeStore {
  // Normalize the state to ensure all observables are hot and replay last value
  return normalizeState(state);
}

function normalizeState<T extends Record<string, any>>(state: T): T {
  const next = { ...state } as Mutable<T>;

  for (const [key, value] of typedEntries(state)) {
    if (isBehaviorSubject(value)) {
      // Already hot + replay; keep as-is
      next[key] = value;
    } else if (isObservable(value)) {
      // Make it shared/replayed; add startWith if you need an initial value
      next[key] = value.pipe(
        // startWith(initialValueIfYouHaveOneForThisKey),
        shareReplay({ bufferSize: 1, refCount: true })
      ) as typeof value;
    }
    // else branch not needed, we copied it already
  }

  return next;
}

// Handy helpers
const isObservable = <T>(v: unknown): v is Observable<T> =>
  !!v && typeof (v as any).subscribe === 'function';

const isBehaviorSubject = <T>(v: unknown): v is BehaviorSubject<T> =>
  !!v && typeof (v as any).getValue === 'function';

// Make a mutable copy type
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

// Typed entries helper
function typedEntries<T extends Record<string, any>>(obj: T): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj);
}
