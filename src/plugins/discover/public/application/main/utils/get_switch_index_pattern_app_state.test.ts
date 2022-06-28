/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getSwitchIndexPatternAppState } from './get_switch_index_pattern_app_state';
import { DataView } from '@kbn/data-views-plugin/public';

/**
 * Helper function returning an index pattern
 */
const getIndexPattern = (id: string, timeFieldName: string, fields: string[]) => {
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

const currentIndexPattern = getIndexPattern('curr', '', ['category', 'name']);
const nextIndexPattern = getIndexPattern('next', '', ['category']);

describe('Discover getSwitchIndexPatternAppState', () => {
  test('removing fields that are not part of the next index pattern, keeping unknown fields ', async () => {
    const result = getSwitchIndexPatternAppState(
      currentIndexPattern,
      nextIndexPattern,
      ['category', 'name', 'unknown'],
      [['category', 'desc']]
    );
    expect(result.columns).toEqual(['category', 'unknown']);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing sorted by fields that are not part of the next index pattern', async () => {
    const result = getSwitchIndexPatternAppState(
      currentIndexPattern,
      nextIndexPattern,
      ['name'],
      [
        ['category', 'desc'],
        ['name', 'asc'],
      ]
    );
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing sorted by fields not available in the next index pattern without modifying columns', async () => {
    const result = getSwitchIndexPatternAppState(
      currentIndexPattern,
      nextIndexPattern,
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
  test('keep sorting by timefield when switching between index patterns with different timeFields', async () => {
    const current = getIndexPattern('a', 'timeFieldA', ['timeFieldA']);
    const next = getIndexPattern('b', 'timeFieldB', ['timeFieldB']);

    const result = getSwitchIndexPatternAppState(current, next, [], [['timeFieldA', 'desc']]);
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timeFieldB', 'desc']]);
  });
  test('remove sorting by timefield when switching to an index pattern without timefield that contains the timefield column', async () => {
    // Why: timefield column is prepended, keeping the sort, user would need to add the column to remove sorting in legacy grid
    const current = getIndexPattern('a', 'timeFieldA', ['timeFieldA']);
    const next = getIndexPattern('b', '', ['timeFieldA']);

    const result = getSwitchIndexPatternAppState(current, next, [], [['timeFieldA', 'desc']]);
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([]);
  });
  test('add sorting by timefield when switching from an index pattern without timefield to an indexpattern with timefield', async () => {
    const current = getIndexPattern('b', '', ['timeFieldA']);
    const next = getIndexPattern('a', 'timeFieldA', ['timeFieldA']);

    const result = getSwitchIndexPatternAppState(current, next, [], []);
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timeFieldA', 'desc']]);
  });
  test('should change sorting for similar index patterns', async () => {
    const current = getIndexPattern('timebased', 'timefield', ['timefield']);
    const next = getIndexPattern('timebased2', 'timefield2', ['timefield', 'timefield2']);

    const result = getSwitchIndexPatternAppState(current, next, [], [['timefield', 'desc']]);
    expect(result.columns).toEqual([]);
    expect(result.sort).toEqual([['timefield2', 'desc']]);
  });
});
