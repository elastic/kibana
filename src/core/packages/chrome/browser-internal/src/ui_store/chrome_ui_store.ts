/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Observable } from 'rxjs';
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
import { createUiStoreFromObservables, ObservableStore } from './ui_store';

export type ChromeUiStore = ObservableStore<ChromeUiState>;

export interface ChromeUiState {
  badge: ChromeBadge | undefined;
  breadcrumbs: ChromeBreadcrumb[];
  breadcrumbsAppendExtensions: ChromeBreadcrumbsAppendExtension[];
  chromeStyle: 'classic' | 'project';
  customBranding: CustomBranding | undefined;
  customNavLink: ChromeNavLink | undefined;
  currentAppId: string | undefined;
  currentActionMenu: MountPoint | undefined;
  globalHelpExtensionMenuLinks: ChromeGlobalHelpExtensionMenuLink[];
  headerBanner: ChromeUserBanner | undefined;
  helpExtension: ChromeHelpExtension | undefined;
  helpMenuLinks: ChromeHelpMenuLink[] | undefined;
  helpSupportUrl: string;
  isVisible: boolean;
  loadingCount: number;
  navControlsCenter: ChromeNavControl[] | undefined;
  navControlsExtension: ChromeNavControl[] | undefined;
  navControlsLeft: ChromeNavControl[] | undefined;
  navControlsRight: ChromeNavControl[] | undefined;
  navLinks: ChromeNavLink[] | undefined;
  recentlyAccessed: ChromeRecentlyAccessedHistoryItem[] | undefined;
  projectBreadcrumbs: ChromeBreadcrumb[] | undefined;
  isSideNavCollapsed: boolean;
  homeHref: string | undefined;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ChromeUiStoreObservableInput = {
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

export function createChromeUiStore(observables: ChromeUiStoreObservableInput): ChromeUiStore {
  const store = createUiStoreFromObservables(observables, {
    mapper: (state): ChromeUiState => ({
      badge: state.badge$,
      breadcrumbs: state.breadcrumbs$,
      breadcrumbsAppendExtensions: state.breadcrumbsAppendExtensions$,
      chromeStyle: state.chromeStyle$ ?? 'classic',
      customBranding: state.customBranding$,
      customNavLink: state.customNavLink$,
      currentAppId: state.currentAppId$,
      currentActionMenu: state.currentActionMenu$,
      globalHelpExtensionMenuLinks: state.globalHelpExtensionMenuLinks$,
      headerBanner: state.headerBanner$,
      helpExtension: state.helpExtension$,
      helpMenuLinks: state.helpMenuLinks$,
      helpSupportUrl: state.helpSupportUrl$,
      isVisible: state.isVisible$ ?? false,
      loadingCount: state.loadingCount$ ?? 0,
      navControlsCenter: state.navControlsCenter$,
      navControlsExtension: state.navControlsExtension$,
      navControlsLeft: state.navControlsLeft$,
      navControlsRight: state.navControlsRight$,
      navLinks: state.navLinks$,
      recentlyAccessed: state.recentlyAccessed$,
      projectBreadcrumbs: state.projectBreadcrumbs$,
      isSideNavCollapsed: state.isSideNavCollapsed$ ?? false,
      homeHref: state.homeHref$,
    }),
  });

  return store;
}
