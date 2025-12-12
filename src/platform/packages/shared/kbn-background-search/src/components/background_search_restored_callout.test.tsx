/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { act, screen } from '@testing-library/react';
import { BackgroundSearchRestoredCallout } from '.';
import { BehaviorSubject } from 'rxjs';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { SearchSessionState } from '@kbn/data-plugin/public';

const PART_OF_CALLOUT_MSG = /You are viewing cached data/;

describe('BackgroundSearchRestoredCallout', () => {
  let subject: BehaviorSubject<SearchSessionState>;

  beforeEach(() => {
    subject = new BehaviorSubject<SearchSessionState>(SearchSessionState.None);
  });

  afterEach(() => {
    subject.complete();
  });

  it('renders when session state becomes Restored', () => {
    renderWithI18n(<BackgroundSearchRestoredCallout state$={subject.asObservable()} />);

    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();

    act(() => subject.next(SearchSessionState.Restored));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();
  });

  it('is visible after Restored state and remains until state becomes neither BackgroundLoading nor Restored', () => {
    renderWithI18n(<BackgroundSearchRestoredCallout state$={subject.asObservable()} />);

    act(() => subject.next(SearchSessionState.BackgroundLoading));
    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();

    act(() => subject.next(SearchSessionState.Restored));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();

    act(() => subject.next(SearchSessionState.BackgroundLoading));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();

    act(() => subject.next(SearchSessionState.Restored));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();

    act(() => subject.next(SearchSessionState.Loading));
    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();
  });

  it('shows again after being hidden when Restored state appears again', () => {
    renderWithI18n(<BackgroundSearchRestoredCallout state$={subject.asObservable()} />);

    act(() => subject.next(SearchSessionState.Restored));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();

    act(() => subject.next(SearchSessionState.Loading));
    expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();

    act(() => subject.next(SearchSessionState.Restored));
    expect(screen.getByText(PART_OF_CALLOUT_MSG)).toBeVisible();
  });

  it('remains hidden for all non-Restored states (state transitions)', () => {
    renderWithI18n(<BackgroundSearchRestoredCallout state$={subject.asObservable()} />);

    const hiddenStates: Array<SearchSessionState> = [
      SearchSessionState.None,
      SearchSessionState.BackgroundCompleted,
      SearchSessionState.Canceled,
      SearchSessionState.Loading,
      SearchSessionState.Completed,
      SearchSessionState.BackgroundLoading,
    ];

    for (const nextState of hiddenStates) {
      act(() => subject.next(nextState));
      expect(screen.queryByText(PART_OF_CALLOUT_MSG)).not.toBeInTheDocument();
    }
  });
});
