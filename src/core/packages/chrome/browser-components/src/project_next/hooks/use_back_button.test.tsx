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
import { useBackButton } from './use_back_button';

describe('useBackButton', () => {
  it('prefers explicit chrome.next.header back over breadcrumbs', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([
      { text: 'Root', href: '/app/r' },
      { text: 'Section', href: '/app/section' },
      { text: 'Current' },
    ]);

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'T',
      back: { href: '/app/explicit', label: 'Explicit' },
    });

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/explicit',
      backDestinationLabel: 'Explicit',
    });
  });

  it('uses explicit back href without label when label is omitted', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Root', href: '/app/r' }, { text: 'Leaf' }]);

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'T',
      back: { href: '/app/only-href' },
    });

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/only-href',
      backDestinationLabel: undefined,
    });
  });

  it('uses explicit back when there is only one breadcrumb', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Only', href: '/app/one' }]);

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'T',
      back: { href: '/app/back' },
    });

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/back',
      backDestinationLabel: undefined,
    });
  });

  it('returns undefined when there are fewer than two breadcrumbs', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Only', href: '/app/one' }]);

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBeUndefined();
  });

  it('uses the only non-last crumb with an href when there are two crumbs', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Root', href: '/app/r' }, { text: 'Leaf' }]);

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/r',
      backDestinationLabel: 'Root',
    });
  });

  it('uses the last non-last crumb with an href when several preceding crumbs have hrefs', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([
      { text: 'Root', href: '/app/r' },
      { text: 'Section', href: '/app/section' },
      { text: 'Current' },
    ]);

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/section',
      backDestinationLabel: 'Section',
    });
  });

  it('uses the last non-last crumb with an href when the root has no href', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([
      { text: 'Root' },
      { text: 'Section', href: '/app/section' },
      { text: 'Current' },
    ]);

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toEqual({
      backHref: '/app/section',
      backDestinationLabel: 'Section',
    });
  });

  it('returns undefined when no non-last crumb has an href', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const breadcrumbs$ = chrome.project.getBreadcrumbs$() as BehaviorSubject<ChromeBreadcrumb[]>;
    breadcrumbs$.next([{ text: 'Root' }, { text: 'Leaf' }]);

    const { result } = renderHook(() => useBackButton(), {
      wrapper: ({ children }) => (
        <TestChromeProviders deps={deps} chrome={chrome}>
          {children}
        </TestChromeProviders>
      ),
    });

    expect(result.current).toBeUndefined();
  });
});
