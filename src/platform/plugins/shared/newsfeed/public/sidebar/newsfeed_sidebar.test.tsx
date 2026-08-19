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
import { BehaviorSubject, of } from 'rxjs';
import moment from 'moment';
import { I18nProvider } from '@kbn/i18n-react';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult, NewsfeedItem } from '../types';
import { NewsfeedSidebar } from './newsfeed_sidebar';

// SidebarHeader and SidebarBody rely on SidebarPanelContext; provide a minimal mock.
jest.mock('@kbn/core-chrome-sidebar-components', () => ({
  SidebarHeader: ({ title, onClose }: { title: string; onClose?: () => void }) => (
    <div data-test-subj="sidebarHeader">
      <h2>{title}</h2>
      {onClose && (
        <button data-test-subj="sidebarHeaderCloseButton" onClick={onClose}>
          Close
        </button>
      )}
    </div>
  ),
  SidebarBody: ({ children }: { children: React.ReactNode }) => (
    <div data-test-subj="sidebarBody">{children}</div>
  ),
}));

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

const renderSidebar = ({
  fetchResult,
  isServerless = false,
}: {
  fetchResult?: FetchResult | null;
  isServerless?: boolean;
} = {}) => {
  const fetchResults$ = new BehaviorSubject<FetchResult | void | null>(
    fetchResult !== undefined ? fetchResult : null
  );
  const markAsRead = jest.fn();
  const newsfeedApi: NewsfeedApi = { fetchResults$, markAsRead };
  const onClose = jest.fn();

  const result = render(
    <I18nProvider>
      <NewsfeedSidebar
        newsfeedApi={newsfeedApi}
        isServerless={isServerless}
        hasCustomBranding$={of(false)}
        onClose={onClose}
      />
    </I18nProvider>
  );

  return { ...result, fetchResults$, onClose };
};

describe('NewsfeedSidebar', () => {
  const user = userEvent.setup();

  test('shows loading prompt while fetch results are pending', () => {
    renderSidebar({ fetchResult: null });
    expect(screen.getByTestId('newsfeedSidebar')).toBeInTheDocument();
    // Loading prompt is rendered — no news items
    expect(screen.queryAllByTestId('newsHeadAlert')).toHaveLength(0);
  });

  test('renders feed items when results arrive', () => {
    const { fetchResults$ } = renderSidebar({ fetchResult: null });
    act(() => {
      fetchResults$.next(createFetchResult());
    });
    expect(screen.getAllByTestId('newsHeadAlert')).toHaveLength(2);
  });

  test('renders empty prompt when feed has no items', () => {
    renderSidebar({ fetchResult: createFetchResult({ feedItems: [] }) });
    expect(screen.getByTestId('emptyNewsfeed')).toBeInTheDocument();
  });

  test('shows version label for non-serverless', () => {
    renderSidebar({ fetchResult: createFetchResult(), isServerless: false });
    expect(screen.getByText(/Version 9\.5\.0/)).toBeInTheDocument();
  });

  test('hides version label for serverless', () => {
    renderSidebar({ fetchResult: createFetchResult(), isServerless: true });
    expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
  });

  test('calls onClose when header close button is clicked', async () => {
    const { onClose } = renderSidebar({ fetchResult: createFetchResult() });
    await user.click(screen.getByTestId('sidebarHeaderCloseButton'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
