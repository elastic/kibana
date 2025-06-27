/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import { joinIndices, timeseriesIndices } from '../__tests__/helpers';

import {
  buildPartialMatcher,
  correctQuerySyntax,
  getBracketsToClose,
  getOverlapRange,
  getQueryForFields,
  specialIndicesToSuggestions,
} from './helper';
import { EDITOR_MARKER } from '../shared/constants';

describe('getOverlapRange', () => {
  it('should return the overlap range', () => {
    expect(getOverlapRange('IS N', 'IS NOT NULL')).toEqual({ start: 0, end: 4 });
    expect(getOverlapRange('I', 'IS NOT NULL')).toEqual({ start: 0, end: 1 });
    expect(getOverlapRange('j', 'IS NOT NULL')).toBeUndefined();
  });

  it('full query', () => {
    expect(getOverlapRange('FROM index | WHERE field IS N', 'IS NOT NULL')).toEqual({
      start: 25,
      end: 29,
    });
  });
});

describe('buildPartialMatcher', () => {
  it('should build a partial matcher', () => {
    const str = 'is NoT nulL';
    const matcher = buildPartialMatcher(str);

    for (let i = 0; i < str.length; i++) {
      expect(matcher.test(str.slice(0, i + 1))).toEqual(true);
    }

    expect(matcher.test('not')).toEqual(false);
    expect(matcher.test('is null')).toEqual(false);
    expect(matcher.test('is not nullz')).toEqual(false);
  });
});

describe('getQueryForFields', () => {
  const assert = (query: string, expected: string) => {
    const { root } = parse(query);

    const result = getQueryForFields(query, root);

    expect(result).toEqual(expected);
  };

  it('should return everything up till the last command', () => {
    const query = 'FROM index | EVAL foo = 1 | STATS field1 | KEEP esql_editor_marker';
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');
  });

  it('should convert FORK branches into vanilla queries', () => {
    const query = `FROM index
    | EVAL foo = 1
    | FORK (STATS field1 | EVAL esql_editor_marker)`;
    assert(query, 'FROM index | EVAL foo = 1 | STATS field1');

    const query2 = `FROM index 
    | EVAL foo = 1
    | FORK (STATS field1) (LIMIT 10) (WHERE field1 == 1 | EVAL esql_editor_marker)`;
    assert(query2, 'FROM index | EVAL foo = 1 | WHERE field1 == 1');
  });

  it('should return empty string if non-FROM source command', () => {
    assert('ROW field1 = 1', '');
    assert('SHOW INFO', '');
  });
});

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

describe('getBracketsToClose', () => {
  it('returns the number of brackets to close', () => {
    expect(getBracketsToClose('foo(bar(baz')).toEqual([')', ')']);
    expect(getBracketsToClose('foo(bar[baz')).toEqual([']', ')']);
    expect(getBracketsToClose('foo(bar[baz"bap')).toEqual(['"', ']', ')']);
    expect(
      getBracketsToClose(
        'from a | eval case(integerField < 0, "negative", integerField > 0, "positive", '
      )
    ).toEqual([')']);
    expect(getBracketsToClose('FROM a | WHERE ("""field: *""")')).toEqual([]);
  });
});

describe('correctQuerySyntax', () => {
  it('appends marker after operator', () => {
    const query = 'FROM foo | EVAL field > ';
    const result = correctQuerySyntax(query);
    expect(result.endsWith(EDITOR_MARKER)).toBe(true);
  });

  it('appends marker after comma', () => {
    const query = 'FROM foo | STATS field1, ';
    const result = correctQuerySyntax(query);
    expect(result.endsWith(EDITOR_MARKER)).toBe(true);
  });

  it('closes unclosed brackets', () => {
    const query = 'FROM foo | EVAL foo(bar[baz';
    const result = correctQuerySyntax(query);
    expect(result.endsWith('])')).toBe(true);
    expect(result).not.toContain(EDITOR_MARKER);
  });

  it('does not change complete query', () => {
    const query = 'FROM index | STATS AVG(field1) != 10';
    // This query is complete, so it should not be modified
    const result = correctQuerySyntax(query);
    expect(result).toEqual(query);
  });

  it('appends marker if all brackets are closed and ends with operator', () => {
    const query = 'FROM index | STATS AVG(field1) != ';
    const result = correctQuerySyntax(query);
    expect(result.endsWith(EDITOR_MARKER)).toBe(true);
  });

  it('handles incomplete function signature', () => {
    const query = 'FROM foo | EVAL foo(bar, ';
    const result = correctQuerySyntax(query);
    expect(result.endsWith(`${EDITOR_MARKER})`)).toBe(true);
  });
});
