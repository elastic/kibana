/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Criteria } from '@elastic/eui';
import { renderHook, act } from '@testing-library/react';
import { useEuiTablePersist } from './use_table_persist';
import { createStorage } from './storage'; // Mock this if it's external

jest.mock('./storage');

describe('useEuiTablePersist', () => {
  const mockStorage = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(() => {
    (createStorage as jest.Mock).mockReturnValue(mockStorage);
    mockStorage.get.mockClear();
    mockStorage.set.mockClear();
  });

  it('should initialize with default values if local storage is empty', () => {
    mockStorage.get.mockReturnValueOnce(undefined);

    const { result } = renderHook(() => useEuiTablePersist({ tableId: 'testTable' }));

    expect(result.current.pageSize).toBe(50); // Default initialPageSize
    expect(result.current.sorting).toBe(true); // Allow sorting by default
    expect(mockStorage.get).toHaveBeenCalledWith('testTable', undefined);
  });

  it('should initialize with values from local storage', () => {
    const persistedData = { pageSize: 25, sort: { field: 'name', direction: 'asc' } };
    mockStorage.get.mockReturnValueOnce(persistedData);

    const { result } = renderHook(() => useEuiTablePersist({ tableId: 'testTable' }));

    expect(result.current.pageSize).toBe(25);
    expect(result.current.sorting).toEqual({ sort: { field: 'name', direction: 'asc' } });
  });

  it('should update pageSize and sort in state and local storage when onTableChange is called', () => {
    const persistedData = { pageSize: 25, sort: { field: 'name', direction: 'asc' } };
    mockStorage.get.mockReturnValueOnce(persistedData);

    const { result } = renderHook(() => useEuiTablePersist({ tableId: 'testTable' }));

    const nextCriteria = {
      page: { size: 100 },
      sort: { field: 'age', direction: 'desc' },
    };

    act(() => {
      result.current.onTableChange(nextCriteria as Criteria<any>);
    });

    expect(result.current.pageSize).toBe(100);
    expect(result.current.sorting).toEqual({ sort: { field: 'age', direction: 'desc' } });
    expect(mockStorage.set).toHaveBeenCalledWith('testTable', {
      pageSize: 100,
      sort: { field: 'age', direction: 'desc' },
    });
  });

  it('should call customOnTableChange if provided', () => {
    const customOnTableChange = jest.fn();

    const { result } = renderHook(() =>
      useEuiTablePersist({
        tableId: 'testTable',
        customOnTableChange,
      })
    );

    const nextCriteria = {
      page: { size: 20 },
      sort: { field: 'age', direction: 'desc' },
    };

    act(() => {
      result.current.onTableChange(nextCriteria as Criteria<any>);
    });

    expect(customOnTableChange).toHaveBeenCalledWith(nextCriteria);
  });

  it('should maintain sort and pageSize if new values are not provided on change', () => {
    const persistedData = { pageSize: 25, sort: { field: 'name', direction: 'asc' } };
    mockStorage.get.mockReturnValueOnce(persistedData);

    const { result } = renderHook(() => useEuiTablePersist({ tableId: 'testTable' }));

    act(() => {
      result.current.onTableChange({}); // Empty change
    });

    expect(result.current.pageSize).toBe(25);
    expect(result.current.sorting).toEqual({ sort: { field: 'name', direction: 'asc' } });
    expect(mockStorage.set).not.toHaveBeenCalled();
  });

  it('should remove sort in state and local storage if field is an empty string', () => {
    const persistedData = { pageSize: 25, sort: { field: 'name', direction: 'asc' } };
    mockStorage.get.mockReturnValueOnce(persistedData);

    const { result } = renderHook(() => useEuiTablePersist({ tableId: 'testTable' }));

    const nextCriteria = {
      page: { size: 100 },
      sort: { field: '', direction: 'asc' },
    };

    act(() => {
      result.current.onTableChange(nextCriteria as Criteria<any>);
    });

    expect(result.current.pageSize).toBe(100);
    expect(result.current.sorting).toEqual(true);
    expect(mockStorage.set).toHaveBeenCalledWith('testTable', {
      pageSize: 100,
      sort: undefined,
    });
  });
});
