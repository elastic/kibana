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
// Relative import so a consumer's `jest.mock('@kbn/app-header', ...)` can't replace the real components.
import { AppHeader as RealAppHeader, AppHeaderView as RealAppHeaderView } from './app_header';

// Supplies the chrome the real header reads from context, avoiding the
// "useChromeService must be used within a ChromeServiceProvider" crash.
const withMockChrome = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => {
    // One stable instance per mount so `useLayoutEffect([chrome])` doesn't re-fire each render.
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
 * Real module with only the two chrome-dependent components swapped for mock-chrome variants.
 *
 * @example
 * jest.mock('@kbn/app-header', () => jest.requireActual('@kbn/app-header/mocks').mockAppHeaderModule());
 */
export const mockAppHeaderModule = () => ({
  ...jest.requireActual('../..'),
  AppHeader: MockAppHeader,
  AppHeaderView: MockAppHeaderView,
});
