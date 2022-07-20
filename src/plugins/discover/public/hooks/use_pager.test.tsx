/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { usePager } from './use_pager';

describe('usePager', () => {
  const defaultProps = {
    initialPageSize: 50,
    totalItems: 750,
  };

  test('should initialize the first page', () => {
    const { result } = renderHook(() => {
      return usePager(defaultProps);
    });

    expect(result.current.curPageIndex).toEqual(0);
    expect(result.current.pageSize).toEqual(50);
    expect(result.current.totalPages).toEqual(15);
    expect(result.current.startIndex).toEqual(0);
    expect(result.current.hasNextPage).toEqual(true);
  });

  test('should change the page', () => {
    const { result } = renderHook(() => {
      return usePager(defaultProps);
    });

    act(() => {
      result.current.changePageIndex(5);
    });

    expect(result.current.curPageIndex).toEqual(5);
    expect(result.current.pageSize).toEqual(50);
    expect(result.current.totalPages).toEqual(15);
    expect(result.current.startIndex).toEqual(250);
    expect(result.current.hasNextPage).toEqual(true);
  });

  test('should go to the last page', () => {
    const { result } = renderHook(() => {
      return usePager(defaultProps);
    });

    act(() => {
      result.current.changePageIndex(14);
    });

    expect(result.current.curPageIndex).toEqual(14);
    expect(result.current.pageSize).toEqual(50);
    expect(result.current.totalPages).toEqual(15);
    expect(result.current.startIndex).toEqual(700);
    expect(result.current.hasNextPage).toEqual(false);
  });

  test('should go to the first page if current is no longer available', () => {
    const { result } = renderHook(() => {
      return usePager({
        initialPageSize: 50,
        totalItems: 100,
      });
    });

    act(() => {
      // go to the second page
      result.current.changePageIndex(1);
      result.current.changePageSize(100);
    });

    expect(result.current.curPageIndex).toEqual(0);
    expect(result.current.pageSize).toEqual(100);
    expect(result.current.totalPages).toEqual(1);
    expect(result.current.startIndex).toEqual(0);
    expect(result.current.hasNextPage).toEqual(false);
  });

  test('should change page size and stay on the current page', () => {
    const { result } = renderHook(() => usePager(defaultProps));

    act(() => {
      result.current.changePageIndex(5);
      result.current.changePageSize(100);
    });

    expect(result.current.curPageIndex).toEqual(5);
    expect(result.current.pageSize).toEqual(100);
    expect(result.current.totalPages).toEqual(8);
    expect(result.current.startIndex).toEqual(500);
    expect(result.current.hasNextPage).toEqual(true);
  });
});
