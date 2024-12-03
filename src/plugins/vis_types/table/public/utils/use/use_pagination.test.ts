/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import { AggTypes } from '../../../common';
import { usePagination } from './use_pagination';

describe('usePagination', () => {
  const visParams = {
    perPage: 10,
    showPartialRows: false,
    showMetricsAtAllLevels: false,
    showToolbar: false,
    showTotal: false,
    totalFunc: AggTypes.SUM,
    percentageCol: '',
    title: 'My data table',
  };

  it('should set up pagination on init', () => {
    const { result } = renderHook(() => usePagination(visParams, 15));

    expect(result.current).toEqual({
      pageIndex: 0,
      pageSize: 10,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });
  });

  it('should skip setting the pagination if perPage is not set', () => {
    const { result } = renderHook(() => usePagination({ ...visParams, perPage: '' }, 15));

    expect(result.current).toBeUndefined();
  });

  it('should change the page via callback', () => {
    const { result } = renderHook(() => usePagination(visParams, 15));

    act(() => {
      // change the page to the next one
      result.current?.onChangePage(1);
    });

    expect(result.current).toEqual({
      pageIndex: 1,
      pageSize: 10,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });
  });

  it('should change items per page via callback', () => {
    const { result } = renderHook(() => usePagination(visParams, 15));

    act(() => {
      // change the page to the next one
      result.current?.onChangeItemsPerPage(20);
    });

    expect(result.current).toEqual({
      pageIndex: 0,
      pageSize: 20,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });
  });

  it('should change the page when props were changed', () => {
    const { result, rerender } = renderHook(
      (props) => usePagination(props.visParams, props.rowCount),
      {
        initialProps: {
          visParams,
          rowCount: 15,
        },
      }
    );
    const updatedParams = { ...visParams, perPage: 5 };

    // change items per page count
    rerender({ visParams: updatedParams, rowCount: 15 });

    expect(result.current).toEqual({
      pageIndex: 0,
      pageSize: 5,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });

    act(() => {
      // change the page to the last one - 3
      result.current?.onChangePage(3);
    });

    expect(result.current).toEqual({
      pageIndex: 3,
      pageSize: 5,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });

    // decrease the rows count
    rerender({ visParams: updatedParams, rowCount: 10 });

    // should switch to the last available page
    expect(result.current).toEqual({
      pageIndex: 1,
      pageSize: 5,
      onChangeItemsPerPage: expect.any(Function),
      onChangePage: expect.any(Function),
    });
  });
});
