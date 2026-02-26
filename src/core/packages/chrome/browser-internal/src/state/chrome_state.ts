/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumbsBadge,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeNavLink,
  ChromeUserBanner,
} from '@kbn/core-chrome-browser';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

import {
  createState,
  createArrayState,
  createPersistedState,
  type State,
  type ArrayState,
} from './state_helpers';
import { createBreadcrumbsState } from './breadcrumbs_state';
import { createVisibilityState, type VisibilityState } from './visibility_state';
import { createChromeStyleState, type ChromeStyleState } from './chrome_style_state';

const IS_SIDENAV_COLLAPSED_KEY = 'core.chrome.isSideNavCollapsed';

export interface ChromeState {
  /** Visibility management */
  visibility: VisibilityState;

  /** Chrome style */
  style: ChromeStyleState;

  /** Side navigation state */
  sideNav: {
    collapsed: State<boolean>;
  };

  /** Breadcrumbs state */
  breadcrumbs: {
    classic: ArrayState<ChromeBreadcrumb>;
    appendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
    badges: ArrayState<ChromeBreadcrumbsBadge>;
    appendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  };

  /** UI elements */
  badge: State<ChromeBadge | undefined>;
  headerBanner: State<ChromeUserBanner | undefined>;
  globalFooter: State<ReactNode>;
  customNavLink: State<ChromeNavLink | undefined>;
  appMenu: State<AppMenuConfig | undefined>;

  /** Help system */
  help: {
    extension: State<ChromeHelpExtension | undefined>;
    supportUrl: State<string>;
    globalMenuLinks: ArrayState<ChromeGlobalHelpExtensionMenuLink>;
  };
}

export interface ChromeStateDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
}

/** Creates all chrome state in one place */
export function createChromeState({ application, docLinks }: ChromeStateDeps): ChromeState {
  // Create headerBanner first (needed by body classes)
  const headerBanner = createState<ChromeUserBanner | undefined>(undefined);

  // Visibility
  const visibility = createVisibilityState({ application });

  // Style
  const style = createChromeStyleState();

  // Side Nav
  const sideNavCollapsed = createPersistedState(IS_SIDENAV_COLLAPSED_KEY, false);

  // Breadcrumbs
  const {
    breadcrumbs,
    breadcrumbsAppendExtensions,
    breadcrumbsBadges,
    breadcrumbsAppendExtensionsWithBadges$,
  } = createBreadcrumbsState();

  // UI Elements (per-app reset handled in setupAppChangeHandler)
  const badge = createState<ChromeBadge | undefined>(undefined);
  const appMenu = createState<AppMenuConfig | undefined>(undefined);

  // UI Elements (not reset on app change)
  const globalFooter = createState<ReactNode>(null);
  const customNavLink = createState<ChromeNavLink | undefined>(undefined);

  // Help System
  const helpExtension = createState<ChromeHelpExtension | undefined>(undefined);
  const helpSupportUrl = createState<string>(docLinks.links.kibana.askElastic);
  const globalHelpMenuLinks = createArrayState<ChromeGlobalHelpExtensionMenuLink>();

  return {
    visibility,
    style,
    sideNav: {
      collapsed: sideNavCollapsed,
    },
    breadcrumbs: {
      classic: breadcrumbs,
      appendExtensions: breadcrumbsAppendExtensions,
      badges: breadcrumbsBadges,
      appendExtensionsWithBadges$: breadcrumbsAppendExtensionsWithBadges$,
    },
    badge,
    headerBanner,
    globalFooter,
    customNavLink,
    appMenu,
    help: {
      extension: helpExtension,
      supportUrl: helpSupportUrl,
      globalMenuLinks: globalHelpMenuLinks,
    },
  };
}
