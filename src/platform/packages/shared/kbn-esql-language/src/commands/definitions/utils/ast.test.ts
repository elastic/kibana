/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EDITOR_MARKER } from '../constants';
import { correctPromqlQuerySyntax, correctQuerySyntax, getBracketsToClose } from './ast';

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
    expect(getBracketsToClose('FROM a | WHERE ("""field: *')).toEqual(['"""', ')']);
  });

  it('ignores any bracket found within string or triple quotes', () => {
    expect(getBracketsToClose('FROM a | WHERE KQL("""field: "something"""")')).toEqual([]);
    expect(getBracketsToClose('FROM a | WHERE FUNCTION("field: (something)")')).toEqual([]);
    expect(getBracketsToClose('FROM a | WHERE FUNCTION("field: (som")')).toEqual([]);
    expect(getBracketsToClose('FROM a | WHERE FUNCTION(""" "field" : (som""")')).toEqual([]);
    expect(getBracketsToClose('FROM a | WHERE FUNCTION(""" "field : (som""")')).toEqual([]);
  });

  it('ignores /* and */ inside string literals but handles real comments', () => {
    expect(getBracketsToClose('KQL("path: */internal/*")')).toEqual([]);
    expect(getBracketsToClose('WHERE field /* comment')).toEqual(['*/']);
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

describe('correctPromqlQuerySyntax', () => {
  it('appends marker after trailing comma', () => {
    const query = 'rate(http_requests_total, ';
    const result = correctPromqlQuerySyntax(query);
    expect(result.endsWith(`${EDITOR_MARKER})`)).toBe(true);
  });

  it('appends marker after trailing colon', () => {
    const query = 'metric[5m:';
    const result = correctPromqlQuerySyntax(query);
    expect(result.endsWith(`${EDITOR_MARKER}]`)).toBe(true);
  });

  it('closes braces and brackets for incomplete selector/function', () => {
    const query = 'sum(rate(http_requests_total{job="api"';
    const result = correctPromqlQuerySyntax(query);
    expect(result.endsWith('}))')).toBe(true);
  });

  it('does not inject marker for trailing operator', () => {
    const query = 'up + ';
    const result = correctPromqlQuerySyntax(query);
    expect(result).toBe(query);
  });

  it('does not add duplicate marker', () => {
    const query = `rate(http_requests_total, ${EDITOR_MARKER}`;
    const result = correctPromqlQuerySyntax(query);
    const markerMatches = result.match(new RegExp(EDITOR_MARKER, 'g')) ?? [];
    expect(markerMatches).toHaveLength(1);
  });
});
