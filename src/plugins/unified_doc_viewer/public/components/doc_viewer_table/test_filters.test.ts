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
import { FieldRow } from './field_row';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

const storage = new Storage(window.localStorage);

const hit = buildDataTableRecord(
  {
    _ignored: [],
    _index: 'test',
    _id: '1',
    _source: {
      'extension.keyword': 'zip',
      bytes: 500,
      '@timestamp': '2021-01-01T00:00:00',
    },
  },
  dataView
);
const rowExtensionKeyword = new FieldRow({
  name: 'extension.keyword',
  flattenedValue: 'zip',
  hit,
  dataView,
  fieldFormats: {} as FieldFormatsStart,
  isPinned: false,
  columnsMeta: undefined,
});
const rowBytes = new FieldRow({
  name: 'bytes',
  flattenedValue: 500,
  hit,
  dataView,
  fieldFormats: {} as FieldFormatsStart,
  isPinned: false,
  columnsMeta: undefined,
});
const rowTimestamp = new FieldRow({
  name: '@timestamp',
  flattenedValue: '2021-01-01T00:00:00',
  hit,
  dataView,
  fieldFormats: {} as FieldFormatsStart,
  isPinned: false,
  columnsMeta: undefined,
});

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
    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBeNull();
  });

  it('should filter by search term', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeSearchTerm('ext');
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBe('ext');
  });

  it('should filter by field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    act(() => {
      result.current.onChangeFieldTypes(['keyword']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    act(() => {
      result.current.onChangeFieldTypes(['number', 'keyword']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    jest.advanceTimersByTime(600);
    expect(storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES)).toBe('["number","keyword"]');
  });

  it('should filter by search term and field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    act(() => {
      result.current.onChangeSearchTerm('ext');
      result.current.onChangeFieldTypes(['keyword']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    act(() => {
      result.current.onChangeSearchTerm('ext');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    act(() => {
      result.current.onChangeSearchTerm('bytes');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    jest.advanceTimersByTime(600);
    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBe('bytes');
    expect(storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES)).toBe('["number"]');
  });

  it('should filter by field value and field type', () => {
    const { result } = renderHook(() => useTableFilters(storage));

    expect(result.current.onFilterField(rowTimestamp)).toBe(true);
    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(true);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    act(() => {
      result.current.onChangeSearchTerm('500');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField(rowTimestamp)).toBe(false);
    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(true);

    act(() => {
      result.current.onChangeSearchTerm('2021');
      result.current.onChangeFieldTypes(['number']);
    });

    expect(result.current.onFilterField(rowTimestamp)).toBe(false);
    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    act(() => {
      result.current.onChangeSearchTerm('2021');
      result.current.onChangeFieldTypes(['date']);
    });

    expect(result.current.onFilterField(rowTimestamp)).toBe(true);
    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(false);

    jest.advanceTimersByTime(600);
    expect(storage.get(LOCAL_STORAGE_KEY_SEARCH_TERM)).toBe('2021');
    expect(storage.get(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES)).toBe('["date"]');
  });

  it('should restore previous filters', () => {
    storage.set(LOCAL_STORAGE_KEY_SEARCH_TERM, 'bytes');
    storage.set(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES, '["number"]');

    const { result } = renderHook(() => useTableFilters(storage));

    expect(result.current.searchTerm).toBe('bytes');
    expect(result.current.selectedFieldTypes).toEqual(['number']);

    expect(result.current.onFilterField(rowExtensionKeyword)).toBe(false);
    expect(result.current.onFilterField(rowBytes)).toBe(true);
    expect(result.current.onFilterField(rowTimestamp)).toBe(false);
  });
});
