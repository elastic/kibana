/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import type { ChromeProjectHeaderConfig } from '@kbn/core-chrome-browser';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../../test_helpers';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { useTitle } from './use_title';

describe('useTitle', () => {
  it('returns the app title from currentAppTitle$', () => {
    const deps = createMockChromeComponentsDeps();
    (deps.application.currentAppTitle$ as BehaviorSubject<string | undefined>).next('Discover');

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => <TestChromeProviders deps={deps}>{children}</TestChromeProviders>,
    });

    expect(result.current).toBe('Discover');
  });

  it('returns "Unknown" when no app title is available', () => {
    const deps = createMockChromeComponentsDeps();

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => <TestChromeProviders deps={deps}>{children}</TestChromeProviders>,
    });

    expect(result.current).toBe('Unknown');
  });

  it('prefers projectHeader config title over app title', () => {
    const deps = createMockChromeComponentsDeps();
    (deps.application.currentAppTitle$ as BehaviorSubject<string | undefined>).next('Dashboards');

    const chrome = chromeServiceMock.createStartContract();
    (chrome.projectHeader.get$() as BehaviorSubject<ChromeProjectHeaderConfig | undefined>).next({
      title: 'My Dashboard',
    });

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBe('My Dashboard');
  });

  it('updates when currentAppTitle$ emits a new value', () => {
    const deps = createMockChromeComponentsDeps();
    const title$ = deps.application.currentAppTitle$ as BehaviorSubject<string | undefined>;
    title$.next('Dashboard');

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => <TestChromeProviders deps={deps}>{children}</TestChromeProviders>,
    });

    expect(result.current).toBe('Dashboard');

    act(() => title$.next('Discover'));
    expect(result.current).toBe('Discover');
  });
});
