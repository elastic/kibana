/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { ChromeServiceProvider } from '@kbn/core-chrome-browser-context';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
// Imported by relative path so a consumer's `jest.mock('@kbn/app-header', ...)` does NOT replace the
// real components used here — the mock renders the genuine header, only supplying the chrome it needs.
import { AppHeader as RealAppHeader, AppHeaderView as RealAppHeaderView } from './app_header';

/**
 * Wraps a component in a `ChromeServiceProvider` backed by `chromeServiceMock` so the real
 * `AppHeader` can render in tests without the `"useChromeService must be used within a
 * ChromeServiceProvider"` crash. The mock chrome instance is created once per mounted instance so
 * `AppHeader`'s `useLayoutEffect([chrome])` does not re-fire on every render.
 */
const withMockChrome = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => {
    const [chrome] = useState(() => chromeServiceMock.createStartContract());
    return (
      <ChromeServiceProvider value={{ chrome }}>
        <Component {...props} />
      </ChromeServiceProvider>
    );
  };
  Wrapped.displayName = `MockChrome(${Component.displayName ?? 'AppHeader'})`;
  return Wrapped;
};

export const MockAppHeader = withMockChrome(RealAppHeader);
export const MockAppHeaderView = withMockChrome(RealAppHeaderView);

/**
 * Spreads the real `@kbn/app-header` module and overrides only the two chrome-dependent components,
 * so every other export (types, registration helpers, and anything added later) survives untouched.
 *
 * @example
 * jest.mock('@kbn/app-header', () => require('@kbn/app-header/mocks').mockAppHeaderModule());
 */
export const mockAppHeaderModule = () => ({
  ...jest.requireActual('../..'),
  AppHeader: MockAppHeader,
  AppHeaderView: MockAppHeaderView,
});
