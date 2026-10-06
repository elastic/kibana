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
  ChromeHelpMenuLink,
  ChromeAiButton,
  ChromeNewsfeedHandler,
  GlobalSearchConfig,
  ChromeNavLink,
  ChromeUserBanner,
  ChromeAppHeaderConfig,
} from '@kbn/core-chrome-browser';
import type { InlineAppHeaderState } from '@kbn/core-chrome-browser-internal-types';
import type { AppMenuConfig } from '@kbn/app-menu';
import { type State, type ArrayState } from './state_helpers';
import { type VisibilityState } from './visibility_state';
import { type ChromeStyleState } from './chrome_style_state';
export interface ChromeState {
  /** Visibility management */
  visibility: VisibilityState;
  /** Chrome style */
  style: ChromeStyleState;
  /** Side navigation state */
  sideNav: {
    collapsed: State<boolean>;
    width: State<number>;
  };
  /** Breadcrumbs state (includes legacy badge from setBadge()) */
  breadcrumbs: {
    classic: ArrayState<ChromeBreadcrumb>;
    appendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
    badges: ArrayState<ChromeBreadcrumbsBadge>;
    legacyBadge: State<ChromeBadge | undefined>;
    appendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
  };
  /** UI elements */
  headerBanner: State<ChromeUserBanner | undefined>;
  globalFooter: State<ReactNode>;
  aiButton: State<ReadonlySet<ChromeAiButton>>;
  globalSearch: State<GlobalSearchConfig | undefined>;
  customNavLink: State<ChromeNavLink | undefined>;
  appMenu: State<AppMenuConfig | undefined>;
  contextSwitcher: State<ReactNode>;
  projectPicker: State<ReactNode>;
  inlineAppHeader: State<InlineAppHeaderState | undefined>;
  inlineAppHeaderOwnerId: number;
  appHeader: State<ChromeAppHeaderConfig | undefined>;
  userMenu: State<ReactNode>;
  /** Help system */
  help: {
    extension: State<ChromeHelpExtension | undefined>;
    supportUrl: State<string>;
    globalMenuLinks: ArrayState<ChromeGlobalHelpExtensionMenuLink>;
    menuLinks: State<ChromeHelpMenuLink[]>;
  };
  /** Feedback handler registered by the feedback plugin */
  feedbackHandler: State<(() => void) | undefined>;
  /** Newsfeed handler registered by the newsfeed plugin */
  newsfeedHandler: State<ChromeNewsfeedHandler | undefined>;
}
export interface ChromeStateDeps {
  application: InternalApplicationStart;
  docLinks: DocLinksStart;
}
/** Creates all chrome state in one place */
export declare function createChromeState({ application, docLinks }: ChromeStateDeps): ChromeState;
