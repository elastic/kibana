/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from '@kbn/esql-ast';
import { EDITOR_MARKER } from '@kbn/esql-ast/src/definitions/utils/constants';
import { correctQuerySyntax, getBracketsToClose, getQueryForFields } from './helper';

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
