/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { coreContextMock } from '@kbn/core-base-browser-mocks';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { CoreEnvContextProvider } from '@kbn/react-kibana-context-env';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal-types';
import type {
  ChromeBreadcrumbsAppendExtension,
  ChromeNavControl,
  ChromeNavLink,
  ChromeUserBanner,
} from '@kbn/core-chrome-browser';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { ChromeComponentsProvider, type ChromeComponentsDeps } from './context';

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
    application: applicationServiceMock.createInternalStartContract(),
    basePath: http.basePath,
    docLinks: docLinksServiceMock.createStartContract(),
    loadingCount$: new BehaviorSubject<number>(0),
    breadcrumbsAppendExtensions$: new BehaviorSubject<ChromeBreadcrumbsAppendExtension[]>([]),
    customBranding$: new BehaviorSubject<CustomBranding>({}),
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

const defaultCoreEnv = coreContextMock.create().env;

export const serverlessCoreEnv = {
  ...defaultCoreEnv,
  packageInfo: { ...defaultCoreEnv.packageInfo, buildFlavor: 'serverless' as const },
};

/**
 * Wraps children with real context providers (`CoreEnvContextProvider`,
 * `ChromeServiceProvider`, `ChromeComponentsProvider`) so that hooks like
 * `useIsServerless()`, `useKibanaVersion()`, `useHelpMenu()`, and
 * `useChromeStyle()` work without module-level `jest.mock` calls.
 *
 * Pass overrides to control test-specific behavior:
 * - `coreEnv` — swap `buildFlavor` to `'serverless'`, change `version`, etc.
 * - `chrome` — pre-configure observable return values on the mock chrome service
 * - `deps` — override individual `ChromeComponentsDeps` fields
 */
export const TestChromeProviders: FC<
  PropsWithChildren<{
    deps?: ChromeComponentsDeps;
    chrome?: InternalChromeStart;
    coreEnv?: typeof defaultCoreEnv;
  }>
> = ({ children, deps, chrome, coreEnv }) => (
  <CoreEnvContextProvider value={coreEnv ?? defaultCoreEnv}>
    <ChromeServiceProvider value={{ chrome: chrome ?? chromeServiceMock.createStartContract() }}>
      <ChromeComponentsProvider value={deps ?? createMockChromeComponentsDeps()}>
        {children}
      </ChromeComponentsProvider>
    </ChromeServiceProvider>
  </CoreEnvContextProvider>
);
