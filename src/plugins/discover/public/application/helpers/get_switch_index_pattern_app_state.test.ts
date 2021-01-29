/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getSwitchIndexPatternAppState } from './get_switch_index_pattern_app_state';
import { IIndexPatternFieldList, IndexPattern } from '../../../../data/common/index_patterns';

const currentIndexPattern: IndexPattern = {
  id: 'prev',
  getFieldByName(name) {
    return this.fields.getByName(name);
  },
  fields: {
    getByName: (name: string) => {
      const fields = [
        { name: 'category', sortable: true },
        { name: 'name', sortable: true },
      ] as IIndexPatternFieldList;
      return fields.find((field) => field.name === name);
    },
  },
} as IndexPattern;

const nextIndexPattern = {
  id: 'next',
  getFieldByName(name) {
    return this.fields.getByName(name);
  },
  fields: {
    getByName: (name: string) => {
      const fields = [{ name: 'category', sortable: true }] as IIndexPatternFieldList;
      return fields.find((field) => field.name === name);
    },
  },
} as IndexPattern;

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
    expect(result.columns).toEqual(['_source']);
    expect(result.sort).toEqual([['category', 'desc']]);
  });
  test('removing sorted by fields that without modifying columns', async () => {
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
});
