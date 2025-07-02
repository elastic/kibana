/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { joinIndices, timeseriesIndices } from './mocks';

import { specialIndicesToSuggestions } from './sources_helpers';

describe('specialIndicesToSuggestions()', () => {
  test('converts join indices to suggestions', () => {
    const suggestions = specialIndicesToSuggestions(joinIndices);
    const labels = suggestions.map((s) => s.label);

    expect(labels).toEqual([
      'join_index',
      'join_index_with_alias',
      'lookup_index',
      'join_index_alias_1',
      'join_index_alias_2',
    ]);
  });

  test('converts timeseries indices to suggestions', () => {
    const suggestions = specialIndicesToSuggestions(timeseriesIndices);
    const labels = suggestions.map((s) => s.label);

    expect(labels).toEqual([
      'timeseries_index',
      'timeseries_index_with_alias',
      'time_series_index',
      'timeseries_index_alias_1',
      'timeseries_index_alias_2',
    ]);
  });
});
