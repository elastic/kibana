/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BehaviorSubject, of } from 'rxjs';
import moment from 'moment';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { SidebarPanelContext } from '@kbn/core-chrome-sidebar-context';
import type { NewsfeedApi } from '../lib/api';
import type { FetchResult, NewsfeedItem } from '../types';
import { NewsfeedSidebar } from './newsfeed_sidebar';

jest.mock('@kbn/react-env', () => ({
  useIsServerless: jest.fn().mockReturnValue(false),
}));

import { useIsServerless } from '@kbn/react-env';

// SidebarHeader reads the panel context for its heading id, so the real components need a
// provider. Supplying one keeps the real header/body in the tree rather than mocking them out.
const panelContext = { headingId: 'newsfeedSidebarHeading', setOnFocusRescue: jest.fn() };

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

const renderSidebar = ({ fetchResult }: { fetchResult?: FetchResult | null } = {}) => {
  const fetchResults$ = new BehaviorSubject<FetchResult | void | null>(
    fetchResult !== undefined ? fetchResult : null
  );
  const markAsRead = jest.fn();
  const newsfeedApi: NewsfeedApi = { fetchResults$, markAsRead };
  const onClose = jest.fn();

  const result = renderWithKibanaRenderContext(
    <SidebarPanelContext.Provider value={panelContext}>
      <NewsfeedSidebar newsfeedApi={newsfeedApi} hasCustomBranding$={of(false)} onClose={onClose} />
    </SidebarPanelContext.Provider>
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
    jest.mocked(useIsServerless).mockReturnValue(false);
    renderSidebar({ fetchResult: createFetchResult() });
    expect(screen.getByText(/Version 9\.5\.0/)).toBeInTheDocument();
  });

  test('hides version label for serverless', () => {
    jest.mocked(useIsServerless).mockReturnValue(true);
    renderSidebar({ fetchResult: createFetchResult() });
    expect(screen.queryByText(/Version/)).not.toBeInTheDocument();
  });

  test('renders the panel heading', () => {
    renderSidebar({ fetchResult: createFetchResult() });
    expect(
      screen.getByRole('heading', { name: "What's new at Elastic", level: 2 })
    ).toBeInTheDocument();
  });

  test('calls onClose when the header close button is clicked', async () => {
    const { onClose } = renderSidebar({ fetchResult: createFetchResult() });
    await user.click(screen.getByRole('button', { name: 'Close side panel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
