/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BehaviorSubject } from 'rxjs';
import moment from 'moment';
import { I18nProvider } from '@kbn/i18n-react';
import { NewsfeedNavButton } from './newsfeed_header_nav_button';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult, NewsfeedItem } from '../types';
import type { SidebarStart } from '@kbn/core-chrome-sidebar';

const createMockItem = (overrides: Partial<NewsfeedItem> = {}): NewsfeedItem => ({
  title: 'Test news item',
  description: 'A test news description',
  linkText: 'Read more',
  linkUrl: 'https://elastic.co/blog/test',
  badge: null,
  publishOn: moment('2026-01-01'),
  expireOn: moment('2027-01-01'),
  hash: 'test-hash-1',
  ...overrides,
});

const createFetchResult = (overrides: Partial<FetchResult> = {}): FetchResult => ({
  kibanaVersion: '9.5.0',
  hasNew: true,
  feedItems: [createMockItem(), createMockItem({ hash: 'test-hash-2', title: 'Second item' })],
  error: null,
  ...overrides,
});

const createMockSidebar = (currentAppId: string | null = null) => {
  const currentAppId$ = new BehaviorSubject<string | null>(currentAppId);
  const openFn = jest.fn();
  const closeFn = jest.fn();

  const sidebar = {
    getCurrentAppId$: () => currentAppId$,
    getCurrentAppId: () => currentAppId$.getValue(),
    getApp: jest.fn().mockReturnValue({ open: openFn, close: closeFn }),
  } as unknown as SidebarStart;

  return { sidebar, currentAppId$, openFn, closeFn };
};

const renderComponent = (fetchResult: FetchResult | null = createFetchResult()) => {
  const fetchResults$ = new BehaviorSubject<FetchResult | void | null>(fetchResult);
  const markAsRead = jest.fn();
  const newsfeedApi: NewsfeedApi = { fetchResults$, markAsRead };
  const { sidebar, currentAppId$, openFn, closeFn } = createMockSidebar();

  const result = render(
    <I18nProvider>
      <NewsfeedNavButton newsfeedApi={newsfeedApi} sidebar={sidebar} />
    </I18nProvider>
  );

  return {
    ...result,
    newsfeedApi,
    fetchResults$,
    markAsRead,
    sidebar,
    currentAppId$,
    openFn,
    closeFn,
  };
};

describe('NewsfeedNavButton', () => {
  const user = userEvent.setup();

  test('indicates unread items when hasNew is true', () => {
    renderComponent(createFetchResult({ hasNew: true }));
    expect(screen.getByTestId('newsfeedHasUnread')).toBeInTheDocument();
  });

  test('indicates all read when hasNew is false', () => {
    renderComponent(createFetchResult({ hasNew: false }));
    expect(screen.getByTestId('newsfeedAllRead')).toBeInTheDocument();
  });

  test('opens the sidebar when clicked', async () => {
    const { openFn } = renderComponent();
    await user.click(screen.getByTestId('newsfeedHasUnread'));
    expect(openFn).toHaveBeenCalledTimes(1);
  });

  test('calls markAsRead with item hashes when opened', async () => {
    const { markAsRead } = renderComponent();
    await user.click(screen.getByTestId('newsfeedHasUnread'));
    expect(markAsRead).toHaveBeenCalledWith(['test-hash-1', 'test-hash-2']);
  });

  test('closes the sidebar when clicked while it is open', async () => {
    const { closeFn, currentAppId$ } = renderComponent();

    // Simulate sidebar opened for newsfeed
    act(() => {
      currentAppId$.next('newsfeed');
    });

    await user.click(screen.getByTestId('newsfeedHasUnread'));
    expect(closeFn).toHaveBeenCalledTimes(1);
  });

  test('updates unread state when fetch results change', () => {
    const { fetchResults$ } = renderComponent(createFetchResult({ hasNew: true }));
    expect(screen.getByTestId('newsfeedHasUnread')).toBeInTheDocument();

    act(() => {
      fetchResults$.next(createFetchResult({ hasNew: false }));
    });
    expect(screen.getByTestId('newsfeedAllRead')).toBeInTheDocument();
  });
});
