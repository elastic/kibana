/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getDefaultSort } from './get_default_sort';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { IndexPattern } from '../../../../kibana_services';

describe('getDefaultSort function', function () {
  let indexPattern: IndexPattern;
  beforeEach(() => {
    indexPattern = FixturesStubbedLogstashIndexPatternProvider() as IndexPattern;
  });
  test('should be a function', function () {
    expect(typeof getDefaultSort === 'function').toBeTruthy();
  });

  test('should return default sort for an index pattern with timeFieldName', function () {
    expect(getDefaultSort(indexPattern, 'desc')).toEqual([['time', 'desc']]);
    expect(getDefaultSort(indexPattern, 'asc')).toEqual([['time', 'asc']]);
  });

  test('should return default sort for an index pattern without timeFieldName', function () {
    delete indexPattern.timeFieldName;
    expect(getDefaultSort(indexPattern, 'desc')).toEqual([]);
    expect(getDefaultSort(indexPattern, 'asc')).toEqual([]);
  });
});
