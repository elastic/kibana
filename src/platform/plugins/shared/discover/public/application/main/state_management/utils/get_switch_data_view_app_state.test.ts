/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDataViewAppState } from './get_switch_data_view_app_state';
import { DataView } from '@kbn/data-views-plugin/public';

const emptyDefaultColumns: string[] = [];

/**
 * Helper function returning an data view
 */
const getDataView = (id: string, timeFieldName: string, fields: string[]) => {
  return {
    id,
    timeFieldName,
    isTimeBased() {
      return !!timeFieldName;
    },
    getFieldByName(name) {
      return this.fields.getByName(name);
    },
    fields: {
      getByName: (name: string) => {
        return fields
          .map((field) => ({
            name: field,
            sortable: true,
          }))
          .find((field) => field.name === name);
      },
    },
  } as DataView;
};

const currentDataView = getDataView('curr', '', ['category', 'name']);
const nextDataView = getDataView('next', '', ['category', 'user_default_column']);

describe('Discover getDataViewAppState', () => {
  test('removing fields that are not part of the next data view, keeping unknown fields ', async () => {
    const result = getDataViewAppState(
      currentDataView,
      nextDataView,
      emptyDefaultColumns,
      ['category', 'name', 'unknown'],
      [['category', 'desc']]
    );
    expect(result.columns).toEqual(['category', 'unknown']);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing fields that are not part of the next data view and adding default columns', async () => {
    const result = getDataViewAppState(
      currentDataView,
      nextDataView,
      ['user_default_column', 'user_unknown_default_column'],
      ['category', 'name', 'user_default_column'],
      [['category', 'desc']]
    );
    expect(result.columns).toEqual(['category', 'user_default_column']);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing sorted by fields that are not part of the next data view', async () => {
    const result = getDataViewAppState(
      currentDataView,
      nextDataView,
      emptyDefaultColumns,
      ['name'],
      [
        ['category', 'desc'],
        ['name', 'asc'],
      ]
    );
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing sorted by fields not available in the next data view without modifying columns', async () => {
    const result = getDataViewAppState(
      currentDataView,
      nextDataView,
      emptyDefaultColumns,
      ['name'],
      [
        ['category', 'desc'],
        ['name', 'asc'],
      ],
      false
    );
    expect(result.columns).toEqual(['name']);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('keep sorting by timefield when switching between data views with different timeFields', async () => {
    const current = getDataView('a', 'timeFieldA', ['timeFieldA']);
    const next = getDataView('b', 'timeFieldB', ['timeFieldB']);

    const result = getDataViewAppState(
      current,
      next,
      emptyDefaultColumns,
      [],
      [['timeFieldA', 'desc']]
    );
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timeFieldB', 'desc']]);
  });
  test('remove sorting by timefield when switching to an data view without timefield that contains the timefield column', async () => {
    // Why: timefield column is prepended, keeping the sort, user would need to add the column to remove sorting in legacy grid
    const current = getDataView('a', 'timeFieldA', ['timeFieldA']);
    const next = getDataView('b', '', ['timeFieldA']);

    const result = getDataViewAppState(
      current,
      next,
      emptyDefaultColumns,
      [],
      [['timeFieldA', 'desc']]
    );
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([]);
  });
  test('add sorting by timefield when switching from an data view without timefield to an dataView with timefield', async () => {
    const current = getDataView('b', '', ['timeFieldA']);
    const next = getDataView('a', 'timeFieldA', ['timeFieldA']);

    const result = getDataViewAppState(current, next, emptyDefaultColumns, [], []);
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timeFieldA', 'desc']]);
  });
  test('should change sorting for similar data views', async () => {
    const current = getDataView('timebased', 'timefield', ['timefield']);
    const next = getDataView('timebased2', 'timefield2', ['timefield', 'timefield2']);

    const result = getDataViewAppState(
      current,
      next,
      emptyDefaultColumns,
      [],
      [['timefield', 'desc']]
    );
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timefield2', 'desc']]);
  });

  // TODO: add tests
});
