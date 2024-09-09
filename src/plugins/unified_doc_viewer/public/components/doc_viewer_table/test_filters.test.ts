/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import {
  useTableFilters,
  LOCAL_STORAGE_KEY_SEARCH_TERM,
  LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES,
} from './table_filters';

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

    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBeNull();
  });

  it('should filter by search term', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeSearchTerm('ext');
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBe('ext');
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

    jest.advanceTimersByTime(600);
    expect(storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES)).toBe('["number","keyword"]');
  });

  it('should filter by search term and field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeSearchTerm('ext');
      result.current.onChangeFieldTypes(['keyword']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(true);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    act(() => {
      result.current.onChangeSearchTerm('ext');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(false);

    act(() => {
      result.current.onChangeSearchTerm('bytes');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);

    jest.advanceTimersByTime(600);
    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBe('bytes');
    expect(storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES)).toBe('["number"]');
  });

  it('should restore previous filters', () => {
    storage.set(LOCAL_STORAGE_KEY_SEARCH_TERM, 'bytes');
    storage.set(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES, '["number"]');

    const { result } = renderHook(() => useTableFilters(storage));

    expect(result.current.searchTerm).toBe('bytes');
    expect(result.current.selectedFieldTypes).toEqual(['number']);

    expect(result.current.onFilterField('extension', undefined, 'keyword')).toBe(false);
    expect(result.current.onFilterField('bytes', undefined, 'number')).toBe(true);
    expect(result.current.onFilterField('bytes_counter', undefined, 'counter')).toBe(false);
  });
});
