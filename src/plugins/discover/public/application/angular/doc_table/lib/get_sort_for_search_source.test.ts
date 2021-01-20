/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getSortForSearchSource } from './get_sort_for_search_source';
// @ts-ignore
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import { IndexPattern } from '../../../../kibana_services';
import { SortOrder } from '../components/table_header/helpers';

describe('getSortForSearchSource function', function () {
  let indexPattern: IndexPattern;
  beforeEach(() => {
    indexPattern = FixturesStubbedLogstashIndexPatternProvider() as IndexPattern;
  });
  test('should be a function', function () {
    expect(typeof getSortForSearchSource === 'function').toBeTruthy();
  });

  test('should return an object to use for searchSource when columns are given', function () {
    const cols = [['bytes', 'desc']] as SortOrder[];
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ bytes: 'desc' }]);
    delete indexPattern.timeFieldName;
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ bytes: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ bytes: 'desc' }]);
  });

  test('should return an object to use for searchSource when no columns are given', function () {
    const cols = [] as SortOrder[];
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ _doc: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ _doc: 'asc' }]);
    delete indexPattern.timeFieldName;
    expect(getSortForSearchSource(cols, indexPattern)).toEqual([{ _score: 'desc' }]);
    expect(getSortForSearchSource(cols, indexPattern, 'asc')).toEqual([{ _score: 'asc' }]);
  });
});
