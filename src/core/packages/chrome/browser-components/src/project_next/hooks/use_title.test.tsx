/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import type { ChromeBreadcrumb, ChromeNextHeaderConfig } from '@kbn/core-chrome-browser';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../../test_helpers';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { useTitle } from './use_title';

describe('useTitle', () => {
  it('returns undefined when there is no config title and project breadcrumbs are empty', () => {
    const deps = createMockChromeComponentsDeps();

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => <TestChromeProviders deps={deps}>{children}</TestChromeProviders>,
    });

    expect(result.current).toBeUndefined();
  });

  it('prefers chrome.next.header config title over breadcrumbs', () => {
    const deps = createMockChromeComponentsDeps();

    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'From breadcrumbs' }]);

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
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

  it('uses a single project breadcrumb string text as title', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Section' }]);

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBe('Section');
  });

  it('uses the last project breadcrumb text when multiple crumbs', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Root', href: '/app/r' }, { text: 'Leaf' }]);

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBe('Leaf');
  });

  it('prefers string text over aria-label when both are present on the chosen crumb', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Visible', 'aria-label': 'Aria title' }]);

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBe('Visible');
  });

  it('returns undefined when breadcrumb text is not a plain string', () => {
    const deps = createMockChromeComponentsDeps();

    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: <span>Rich</span> }]);

    const { result } = renderHook(() => useTitle(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBeUndefined();
  });
});
