/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import {
  useExitFullscreenOnEmptyResults,
  type UseExitFullscreenOnEmptyResultsParams,
} from './use_exit_fullscreen_on_empty_results';

describe('useExitFullscreenOnEmptyResults', () => {
  const onExitFullscreen = jest.fn();

  const defaultParams: UseExitFullscreenOnEmptyResultsParams = {
    isFullscreen: true,
    isLoading: false,
    isComponentVisible: true,
    hasMetrics: false,
    onExitFullscreen,
  };

  const render = (params: Partial<UseExitFullscreenOnEmptyResultsParams> = {}) =>
    renderHook(
      (props: UseExitFullscreenOnEmptyResultsParams) => useExitFullscreenOnEmptyResults(props),
      { initialProps: { ...defaultParams, ...params } }
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exits fullscreen when a settled fetch returns no metrics', () => {
    render();

    expect(onExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('exits fullscreen only once while the results stay empty', () => {
    const { rerender } = render();

    rerender({ ...defaultParams, isFullscreen: false });
    rerender({ ...defaultParams, isFullscreen: false });

    expect(onExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('does not exit fullscreen while a fetch is in flight', () => {
    render({ isLoading: true });

    expect(onExitFullscreen).not.toHaveBeenCalled();
  });

  it('does not exit fullscreen when the chart section is hidden', () => {
    render({ isComponentVisible: false });

    expect(onExitFullscreen).not.toHaveBeenCalled();
  });

  it('does not exit fullscreen when metrics are available', () => {
    render({ hasMetrics: true });

    expect(onExitFullscreen).not.toHaveBeenCalled();
  });

  it('does not exit fullscreen when not in fullscreen', () => {
    render({ isFullscreen: false });

    expect(onExitFullscreen).not.toHaveBeenCalled();
  });

  it('exits fullscreen once the in-flight fetch settles with no metrics', () => {
    const { rerender } = render({ isLoading: true });

    expect(onExitFullscreen).not.toHaveBeenCalled();

    rerender({ ...defaultParams, isLoading: false });

    expect(onExitFullscreen).toHaveBeenCalledTimes(1);
  });

  it('keeps fullscreen through a refetch that still returns metrics', () => {
    const { rerender } = render({ hasMetrics: true });

    rerender({ ...defaultParams, hasMetrics: true, isLoading: true });
    rerender({ ...defaultParams, hasMetrics: true, isLoading: false });

    expect(onExitFullscreen).not.toHaveBeenCalled();
  });
});
