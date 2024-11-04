/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react-hooks';
import {
  FULL_WIDTH_PADDING,
  MAX_RESOLUTION_BREAKPOINT,
  MIN_RESOLUTION_BREAKPOINT,
  RIGHT_SECTION_MAX_WIDTH,
  RIGHT_SECTION_MIN_WIDTH,
  useWindowWidth,
} from './use_window_width';
import { useDispatch } from '../store/redux';
import { setDefaultWidthsAction } from '../store/actions';

jest.mock('../store/redux');

describe('useWindowWidth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return the window size and dispatch setDefaultWidthsAction', () => {
    global.innerWidth = 1024;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(1024);
    expect(mockUseDispatch).toHaveBeenCalled();
  });

  it('should not dispatch action if window.innerWidth is 0', () => {
    global.innerWidth = 0;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(0);
    expect(mockUseDispatch).not.toHaveBeenCalled();
  });

  it('should handle very small screens', () => {
    global.innerWidth = 300;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(300);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        left: -48,
        right: 300,
        preview: 300,
      })
    );
  });

  it('should handle small screens', () => {
    global.innerWidth = 500;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(500);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        left: 72,
        right: 380,
        preview: 380,
      })
    );
  });

  it('should handle medium screens', () => {
    global.innerWidth = 1300;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    const right =
      RIGHT_SECTION_MIN_WIDTH +
      (RIGHT_SECTION_MAX_WIDTH - RIGHT_SECTION_MIN_WIDTH) *
        ((1300 - MIN_RESOLUTION_BREAKPOINT) /
          (MAX_RESOLUTION_BREAKPOINT - MIN_RESOLUTION_BREAKPOINT));
    const left = 1300 - right - FULL_WIDTH_PADDING;
    const preview = right;

    expect(hookResult.result.current).toEqual(1300);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        left,
        right,
        preview,
      })
    );
  });

  it('should handle large screens', () => {
    global.innerWidth = 2500;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(2500);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        left: 1400,
        right: 750,
        preview: 750,
      })
    );
  });

  it('should handle very large screens', () => {
    global.innerWidth = 3800;

    const mockUseDispatch = jest.fn();
    (useDispatch as jest.Mock).mockImplementation(() => mockUseDispatch);

    const hookResult = renderHook(() => useWindowWidth());

    expect(hookResult.result.current).toEqual(3800);
    expect(mockUseDispatch).toHaveBeenCalledWith(
      setDefaultWidthsAction({
        left: 1500,
        right: 750,
        preview: 750,
      })
    );
  });
});
