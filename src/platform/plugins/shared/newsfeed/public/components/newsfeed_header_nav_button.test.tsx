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

const renderComponent = (fetchResult: FetchResult | null = createFetchResult()) => {
  const fetchResults$ = new BehaviorSubject<FetchResult | void | null>(fetchResult);
  const markAsRead = jest.fn();
  const newsfeedApi: NewsfeedApi = { fetchResults$, markAsRead };
  const isOpen$ = new BehaviorSubject<boolean>(false);
  const onToggle = jest.fn();

  const result = render(
    <I18nProvider>
      <NewsfeedNavButton newsfeedApi={newsfeedApi} isOpen$={isOpen$} onToggle={onToggle} />
    </I18nProvider>
  );

  return { ...result, newsfeedApi, fetchResults$, markAsRead, isOpen$, onToggle };
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

  test('toggles when clicked', async () => {
    const { onToggle } = renderComponent();
    await user.click(screen.getByTestId('newsfeedHasUnread'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('reflects the open state on aria-expanded', () => {
    const { isOpen$ } = renderComponent();
    expect(screen.getByTestId('newsfeedHasUnread')).toHaveAttribute('aria-expanded', 'false');

    act(() => {
      isOpen$.next(true);
    });
    expect(screen.getByTestId('newsfeedHasUnread')).toHaveAttribute('aria-expanded', 'true');
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
