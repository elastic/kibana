/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UseQueryResult } from '@tanstack/react-query';
import { useCombinedQueries } from '..';
import { renderHook } from '@testing-library/react-hooks';

const query1 = {
  isLoading: false,
  isFetching: false,
  isError: false,
  isSuccess: true,
  data: 'data1',
  refetch: jest.fn(),
} as unknown as UseQueryResult;

const query2 = {
  isLoading: true,
  isFetching: false,
  isError: false,
  isSuccess: false,
  data: 'data2',
  refetch: jest.fn(),
} as unknown as UseQueryResult;

const query3 = {
  isLoading: false,
  isFetching: true,
  isError: false,
  isSuccess: true,
  data: 'data3',
  refetch: jest.fn(),
} as unknown as UseQueryResult;

describe('useCombinedQueries', () => {
  it('should return the correct values', () => {
    const { result } = renderHook(() => useCombinedQueries(query1, query2, query3));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toEqual(['data1', 'data2', 'data3']);
    result.current.refetch();
    expect(query1.refetch).toHaveBeenCalled();
    expect(query2.refetch).toHaveBeenCalled();
    expect(query3.refetch).toHaveBeenCalled();
  });
});
