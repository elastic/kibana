/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import type {
  ChromeBreadcrumb,
  ChromeBreadcrumbsAppendExtension,
  ChromeGlobalHelpExtensionMenuLink,
  ChromeHelpExtension,
  ChromeHelpMenuLink,
  ChromeNavControl,
  ChromeNavLink,
  ChromeProjectNavigationNode,
  ChromeUserBanner,
  NavigationTreeDefinitionUI,
  SolutionId,
} from '@kbn/core-chrome-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import type { RecentlyAccessedHistoryItem } from '@kbn/recently-accessed';
import type { ChromeComponentsDeps } from './context';

/**
 * Creates a full {@link ChromeComponentsDeps} mock backed by {@link BehaviorSubject} instances so
 * individual tests can push new values reactively via `act(() => deps.xxx$.next(...))`.
 *
 * The return type is inferred (not narrowed to `ChromeComponentsDeps`) so callers retain access to
 * `.next()` on each subject. A `satisfies` check still validates structural compatibility.
 *
 * Internal to this package — not re-exported from `index.ts`.
 */
export const createMockChromeComponentsDeps = () => {
  const http = httpServiceMock.createSetupContract({ basePath: '/test' });
  return {
    config: { isServerless: false, kibanaVersion: '1.0.0', homeHref: '/', kibanaDocLink: '/docs' },
    application: applicationServiceMock.createInternalStartContract(),
    basePath: http.basePath,
    docLinks: docLinksServiceMock.createStartContract(),
    loadingCount$: new BehaviorSubject<number>(0),
    classic: {
      breadcrumbs$: new BehaviorSubject<ChromeBreadcrumb[]>([]),
      recentlyAccessed$: new BehaviorSubject<RecentlyAccessedHistoryItem[]>([]),
      customNavLink$: new BehaviorSubject<ChromeNavLink | undefined>(undefined),
    },
    project: {
      breadcrumbs$: new BehaviorSubject<ChromeBreadcrumb[]>([]),
      homeHref$: new BehaviorSubject<string>('/'),
      navigation$: new BehaviorSubject<{
        solutionId: SolutionId;
        navigationTree: NavigationTreeDefinitionUI;
        activeNodes: ChromeProjectNavigationNode[][];
      }>(undefined as any),
    },
    breadcrumbsAppendExtensions$: new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([]),
    customBranding$: new BehaviorSubject<CustomBranding>({}),
    helpMenu: {
      menuLinks$: new BehaviorSubject<ChromeHelpMenuLink[]>([]),
      extension$: new BehaviorSubject<ChromeHelpExtension | undefined>(undefined),
      supportUrl$: new BehaviorSubject<string>(''),
      globalExtensionMenuLinks$: new BehaviorSubject<ChromeGlobalHelpExtensionMenuLink[]>([]),
    },
    navLinks$: new BehaviorSubject<ChromeNavLink[]>([]),
    navControls: {
      left$: new BehaviorSubject<ChromeNavControl[]>([]),
      center$: new BehaviorSubject<ChromeNavControl[]>([]),
      right$: new BehaviorSubject<ChromeNavControl[]>([]),
      extension$: new BehaviorSubject<ChromeNavControl[]>([]),
    },
    appMenu$: new BehaviorSubject<AppMenuConfig | undefined>(undefined),
    headerBanner$: new BehaviorSubject<ChromeUserBanner | undefined>(undefined),
    sideNav: {
      collapsed$: new BehaviorSubject<boolean>(false),
      initialCollapsed: false,
      onToggleCollapsed: jest.fn(),
    },
  } satisfies ChromeComponentsDeps;
};
