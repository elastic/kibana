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
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import { ChromeComponentsProvider, type ChromeComponentsDeps } from './context';

/**
 * Creates a full {@link ChromeComponentsDeps} mock backed by service mocks so
 * individual tests can push new values reactively via `act(() => deps.customBranding.customBranding$.next(...))`.
 *
 * The return type is inferred (not narrowed to `ChromeComponentsDeps`) so callers retain access to
 * mock-specific methods like `.next()`. A `satisfies` check still validates structural compatibility.
 *
 * Internal to this package — not re-exported from `index.ts`.
 */
export const createMockChromeComponentsDeps = () => {
  return {
    application: applicationServiceMock.createInternalStartContract(),
    http: httpServiceMock.createSetupContract({ basePath: '/test' }),
    docLinks: docLinksServiceMock.createStartContract(),
    customBranding: {
      customBranding$: new BehaviorSubject<CustomBranding>({}),
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
