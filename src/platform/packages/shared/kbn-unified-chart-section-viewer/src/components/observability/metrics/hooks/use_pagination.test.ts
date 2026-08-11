/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { usePagination } from './use_pagination';

describe('usePagination', () => {
  it('calculates totalPages, currentPageItems, and totalCount for 45 items with pageSize 20 on page 0', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination({ items, pageSize: 20, currentPage: 0 }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageItems).toHaveLength(20);
    expect(result.current.totalCount).toBe(45);
    expect(result.current.currentPageItems[0]).toEqual({ id: 0 });
    expect(result.current.currentPageItems[19]).toEqual({ id: 19 });
  });

  it('returns correct items for the last page (page 2 of 3) with remainder', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination({ items, pageSize: 20, currentPage: 2 }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageItems).toHaveLength(5);
    expect(result.current.totalCount).toBe(45);
    expect(result.current.currentPageItems[0]).toEqual({ id: 40 });
    expect(result.current.currentPageItems[4]).toEqual({ id: 44 });
  });

  it('returns totalPages 1 when items exactly fill one page', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination({ items, pageSize: 20, currentPage: 0 }));

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPageItems).toHaveLength(20);
    expect(result.current.totalCount).toBe(20);
  });

  it('returns empty results for empty items array', () => {
    const { result } = renderHook(() => usePagination({ items: [], pageSize: 20, currentPage: 0 }));

    expect(result.current.totalPages).toBe(0);
    expect(result.current.currentPageItems).toEqual([]);
    expect(result.current.totalCount).toBe(0);
  });

  it('returns empty currentPageItems when page is beyond range', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result } = renderHook(() => usePagination({ items, pageSize: 20, currentPage: 5 }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageItems).toEqual([]);
    expect(result.current.totalCount).toBe(45);
  });

  it('updates when items change', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    const { result, rerender } = renderHook(
      ({ items: hookItems, pageSize, currentPage }) =>
        usePagination({ items: hookItems, pageSize, currentPage }),
      { initialProps: { items, pageSize: 5, currentPage: 0 } }
    );

    expect(result.current.totalPages).toBe(2);
    expect(result.current.currentPageItems).toHaveLength(5);

    const newItems = Array.from({ length: 30 }, (_, i) => ({ id: i }));
    rerender({ items: newItems, pageSize: 5, currentPage: 0 });

    expect(result.current.totalPages).toBe(6);
    expect(result.current.currentPageItems).toHaveLength(5);
  });

  it('updates when pageSize changes', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result, rerender } = renderHook(
      ({ items: hookItems, pageSize, currentPage }) =>
        usePagination({ items: hookItems, pageSize, currentPage }),
      { initialProps: { items, pageSize: 20, currentPage: 0 } }
    );

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPageItems).toHaveLength(20);

    rerender({ items, pageSize: 10, currentPage: 0 });

    expect(result.current.totalPages).toBe(5);
    expect(result.current.currentPageItems).toHaveLength(10);
  });

  it('updates when currentPage changes', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({ id: i }));
    const { result, rerender } = renderHook(
      ({ items: hookItems, pageSize, currentPage }) =>
        usePagination({ items: hookItems, pageSize, currentPage }),
      { initialProps: { items, pageSize: 20, currentPage: 0 } }
    );

    expect(result.current.currentPageItems[0]).toEqual({ id: 0 });

    rerender({ items, pageSize: 20, currentPage: 1 });

    expect(result.current.currentPageItems[0]).toEqual({ id: 20 });
  });
});
