/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { useTableFilters, SEARCH_TEXT } from './table_filters';

const storage = new Storage(window.localStorage);

describe('useTableFilters', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    storage.clear();
  });

  it('should return initial search term and field types', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    expect(result.current.searchTerm).toBe('');
    expect(result.current.selectedFieldTypes).toEqual([]);
    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);

    expect(storage.get(SEARCH_TEXT)).toBeNull();
  });

  it('should filter by search term', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onSearchTermChanged('ext');
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    expect(storage.get(SEARCH_TEXT)).toBe('ext');
  });

  it('should filter by field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);

    act(() => {
      result.current.onChangeFieldTypes(['keyword']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    act(() => {
      result.current.onChangeFieldTypes(['number', 'keyword']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);
  });

  it('should filter by search term and field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onSearchTermChanged('ext');
      result.current.onChangeFieldTypes(['keyword']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    act(() => {
      result.current.onSearchTermChanged('ext');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    act(() => {
      result.current.onSearchTermChanged('bytes');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);

    jest.advanceTimersByTime(600);
    expect(storage.get(SEARCH_TEXT)).toBe('bytes');
  });
});
