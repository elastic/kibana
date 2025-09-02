/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { act, cleanup, screen } from '@testing-library/react';
import { BackgroundSearchRestoredCallout } from './background_search_restored_callout';
import { BehaviorSubject } from 'rxjs';
import {
  getBackgroundSearchState$,
  isBackgroundSearchEnabled,
} from '../services/background_search_service';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { SearchSessionState } from '@kbn/data-plugin/public';

const PART_OF_CALLOUT_MSG = /You are viewing cached data/;

jest.mock('../services/background_search_service', () => ({
  getBackgroundSearchState$: jest.fn(),
  isBackgroundSearchEnabled: jest.fn(),
}));

describe('BackgroundSearchRestoredCallout', () => {
  let subject: BehaviorSubject<SearchSessionState | undefined>;

  beforeEach(() => {
    subject = new BehaviorSubject<SearchSessionState | undefined>(undefined);
    (getBackgroundSearchState$ as jest.Mock).mockReturnValue(subject.asObservable());
    (isBackgroundSearchEnabled as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    subject.complete();
    jest.resetAllMocks();
  });

  it('does not render when feature flag is disabled', () => {
    (isBackgroundSearchEnabled as jest.Mock).mockReturnValue(false);

    renderWithI18n(<BackgroundSearchRestoredCallout />);

    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();
  });

  it('renders when session state becomes Restored', async () => {
    renderWithI18n(<BackgroundSearchRestoredCallout />);

    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).toBeNull();

    act(() => subject.next(SearchSessionState.Restored));
    expect(await screen.findByText(PART_OF_CALLOUT_MSG)).toBeVisible();
  });

  it('is visible for BackgroundLoading and remains visible for Restored', async () => {
    renderWithI18n(<BackgroundSearchRestoredCallout />);

    act(() => subject.next(SearchSessionState.BackgroundLoading));
    expect(await screen.findByText(PART_OF_CALLOUT_MSG)).toBeVisible();

    act(() => subject.next(SearchSessionState.Restored));
    expect(await screen.findByText(PART_OF_CALLOUT_MSG)).toBeVisible();
  });

  it('disappear if the session state was Restored and switched to other state', async () => {
    renderWithI18n(<BackgroundSearchRestoredCallout />);

    act(() => subject.next(SearchSessionState.Restored));
    expect(await screen.findByText(PART_OF_CALLOUT_MSG)).toBeInTheDocument();

    act(() => subject.next(SearchSessionState.BackgroundCompleted));
    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();
  });
});
