/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { renderHook, act } from '@testing-library/react';
import { PaginationProps, usePagination } from './use_pagination';

describe('usePagination', () => {
  const onPageChange = jest.fn();
  const pageIndex = 0;
  const pageSize = 10;
  const bulkActionsStore = [{}, jest.fn()] as unknown as PaginationProps['bulkActionsStore'];

  beforeEach(() => {
    onPageChange.mockClear();
  });

  it('should return the pagination information and callback functions', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, bulkActionsStore })
    );
    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize });
    expect(result.current.onChangePageSize).toBeDefined();
    expect(result.current.onChangePageIndex).toBeDefined();
  });

  it('should change the pagination when `onChangePageSize` is called', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, bulkActionsStore })
    );

    act(() => {
      result.current.onChangePageSize(20);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex, pageSize: 20 });
  });

  it('should change the pagination when `onChangePageIndex` is called', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, bulkActionsStore })
    );

    act(() => {
      result.current.onChangePageIndex(1);
    });

    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize });
  });

  it('should paginate the alert flyout', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex, pageSize, bulkActionsStore })
    );

    expect(result.current.flyoutAlertIndex).toBe(-1);

    act(() => {
      result.current.onPaginateFlyout(0);
    });

    expect(result.current.flyoutAlertIndex).toBe(0);

    act(() => {
      result.current.onPaginateFlyout(1);
    });

    expect(result.current.flyoutAlertIndex).toBe(1);

    act(() => {
      result.current.onPaginateFlyout(0);
    });

    expect(result.current.flyoutAlertIndex).toBe(0);
  });

  it('should paginate the flyout when we need to change the page index going forward', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex: 0, pageSize: 1, bulkActionsStore })
    );

    act(() => {
      result.current.onPaginateFlyout(1);
    });

    // It should reset to the first alert in the table
    expect(result.current.flyoutAlertIndex).toBe(0);

    // It should go to the first page
    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize: 1 });
  });

  it('should paginate the flyout when we need to change the page index going forward using odd-count data', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex: 0, pageSize: 7, bulkActionsStore })
    );

    act(() => {
      result.current.onPaginateFlyout(1);
    });
    expect(result.current.flyoutAlertIndex).toBe(1);

    /*
     * 7 is the next first item in the next page
     */
    act(() => {
      result.current.onPaginateFlyout(7);
    });
    expect(result.current.flyoutAlertIndex).toBe(0);
    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize: 7 });
    act(() => {
      result.current.onPaginateFlyout(8);
    });
    expect(result.current.flyoutAlertIndex).toBe(1);
    expect(result.current.pagination).toStrictEqual({ pageIndex: 1, pageSize: 7 });

    // Let's make sure we are not breaking the logic when we ask for the same index
    act(() => {
      result.current.onPaginateFlyout(8);
    });
    expect(result.current.flyoutAlertIndex).toBe(1);

    // Now let's make sure that we get an older page
    act(() => {
      result.current.onPaginateFlyout(12);
    });
    expect(result.current.flyoutAlertIndex).toBe(5);
  });

  it('should paginate the flyout when we need to change the page index going back', () => {
    const { result } = renderHook(() =>
      usePagination({ onPageChange, pageIndex: 0, pageSize: 1, bulkActionsStore })
    );

    act(() => {
      result.current.onPaginateFlyout(-1);
    });

    // It should reset to the first alert in the table
    expect(result.current.flyoutAlertIndex).toBe(0);

    // It should go to the last page
    expect(result.current.pagination).toStrictEqual({ pageIndex: 0, pageSize: 1 });
  });
});
