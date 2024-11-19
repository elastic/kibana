/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react-hooks';
import { usePagination } from './use_pagination';

const onPaginationChange = jest.fn();

describe('usePagination', () => {
  test('should return the correct EuiTablePagination props when all the pagination object properties are falsy', () => {
    const pagination = { pageIndex: 0, pageSize: 0, totalItemCount: 0 };

    const { result } = renderHook(() => usePagination({ pagination, onPaginationChange }));
    const { pageCount, pageIndex, pageSize, pageSizeOptions } = result.current;
    expect(pageCount).toEqual(0);
    expect(pageIndex).toEqual(0);
    expect(pageSize).toEqual(0);
    expect(pageSizeOptions).toEqual(undefined);
  });
  test('should return the correct pageCount when pagination properties are invalid', () => {
    const pagination = { pageIndex: 0, pageSize: 10, totalItemCount: 0 };

    const { result } = renderHook(() => usePagination({ pagination, onPaginationChange }));
    const { pageCount } = result.current;
    expect(pageCount).toEqual(0);
  });
  test('should return the correct EuiTablePagination props when all the pagination object properties are turthy', () => {
    const pagination = { pageIndex: 0, pageSize: 10, totalItemCount: 100 };

    const { result } = renderHook(() => usePagination({ pagination, onPaginationChange }));
    const { pageCount, pageIndex, pageSize } = result.current;
    expect(pageCount).toEqual(10);
    expect(pageIndex).toEqual(0);
    expect(pageSize).toEqual(10);
  });
  test('should call onPaginationChange with correct pageIndex when the Page changes', () => {
    const pagination = { pageIndex: 0, pageSize: 10, totalItemCount: 100 };

    const { result } = renderHook(() => usePagination({ pagination, onPaginationChange }));
    const { handlePageIndexChange } = result.current;

    act(() => {
      handlePageIndexChange(2);
    });
    expect(onPaginationChange).toHaveBeenCalledWith({
      pagination: { pageIndex: 2, pageSize: 10, totalItemCount: 100 },
    });
  });
  test('should call onPaginationChange with correct pageSize when the number of items per change changes', () => {
    const pagination = { pageIndex: 0, pageSize: 10, totalItemCount: 100 };

    const { result } = renderHook(() => usePagination({ pagination, onPaginationChange }));
    const { handleItemsPerPageChange } = result.current;

    act(() => {
      handleItemsPerPageChange(100);
    });
    expect(onPaginationChange).toHaveBeenCalledWith({
      pagination: { pageIndex: 0, pageSize: 100, totalItemCount: 100 },
    });
  });
});
