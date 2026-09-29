/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const registerRouteForBundleMock = vi.fn();
vi.doMock('./bundles_route', () => {
      const mocked = {
      registerRouteForBundle: registerRouteForBundleMock,
    };
      return { ...mocked, default: mocked };
    });

vi.doMock('@kbn/ui-shared-deps-src', () => {
      const mocked = {
      distDir: 'uiSharedDepsSrcDistDir',
    };
      return { ...mocked, default: mocked };
    });

vi.doMock('@kbn/ui-shared-deps-npm', () => {
      const mocked = {
      distDir: 'uiSharedDepsNpmDistDir',
    };
      return { ...mocked, default: mocked };
    });

vi.doMock('@kbn/monaco/server', () => {
      const mocked = {
      bundleDir: 'kbnMonacoBundleDir',
    };
      return { ...mocked, default: mocked };
    });
