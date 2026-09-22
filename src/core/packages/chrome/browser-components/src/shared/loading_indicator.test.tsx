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
import { BehaviorSubject } from 'rxjs';

import { LoadingIndicator } from './loading_indicator';
import { createMockChromeComponentsDeps } from '../test_helpers';
import { ChromeComponentsProvider } from '../context';
import { LOADING_DEBOUNCE_TIME } from './chrome_hooks';

const setup = (loadingCount = 0) => {
  const loadingCount$ = new BehaviorSubject(loadingCount);
  const deps = createMockChromeComponentsDeps();
  (deps.http.getLoadingCount$ as jest.Mock).mockReturnValue(loadingCount$);
  return { loadingCount$, deps };
};

const renderIndicator = (deps: ReturnType<typeof createMockChromeComponentsDeps>, props = {}) =>
  render(
    <ChromeComponentsProvider value={deps}>
      <LoadingIndicator {...props} />
    </ChromeComponentsProvider>
  );

describe('LoadingIndicator', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('is hidden when loading count is 0', () => {
    const { deps } = setup(0);
    renderIndicator(deps);
    expect(screen.getByTestId('globalLoadingIndicator-hidden')).toBeInTheDocument();
  });

  it('shows spinner when loading count > 0 (after debounce)', () => {
    const { deps } = setup(1);
    renderIndicator(deps);
    act(() => jest.advanceTimersByTime(LOADING_DEBOUNCE_TIME));
    expect(screen.getByTestId('globalLoadingIndicator')).toBeInTheDocument();
  });

  it('shows progress bar when showAsBar is true', () => {
    const { deps } = setup(1);
    renderIndicator(deps, { showAsBar: true });
    act(() => jest.advanceTimersByTime(LOADING_DEBOUNCE_TIME));
    expect(screen.getByTestId('globalLoadingIndicator')).toBeInTheDocument();
  });

  it('hides spinner when loading count drops back to 0', () => {
    const { loadingCount$, deps } = setup(1);
    renderIndicator(deps);

    act(() => jest.advanceTimersByTime(LOADING_DEBOUNCE_TIME));
    expect(screen.getByTestId('globalLoadingIndicator')).toBeInTheDocument();

    act(() => loadingCount$.next(0));
    act(() => jest.advanceTimersByTime(LOADING_DEBOUNCE_TIME));
    expect(screen.getByTestId('globalLoadingIndicator-hidden')).toBeInTheDocument();
  });
});
