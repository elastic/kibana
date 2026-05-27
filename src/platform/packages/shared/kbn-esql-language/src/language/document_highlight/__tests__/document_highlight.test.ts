/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getDocumentHighlightItems } from '..';

describe('getDocumentHighlightItems()', () => {
  const getHighlights = (statement: string, triggerString: string) => {
    const offset = statement.lastIndexOf(triggerString);
    return getDocumentHighlightItems(statement, offset);
  };

  test('returns empty array when cursor is not on a column', () => {
    const highlights = getHighlights('FROM index | EVAL 1 + 2', 'EVAL');
    expect(highlights).toEqual([]);
  });

  test('highlights a single occurrence of a field', () => {
    const query = 'FROM index | WHERE field1 > 10';
    const highlights = getHighlights(query, 'field1');
    expect(highlights).toHaveLength(1);
  });

  test('highlights multiple occurrences of the same field', () => {
    const query = 'FROM index | WHERE field1 > field2 | STATS count() BY field1';
    const highlights = getHighlights(query, 'field1');
    expect(highlights).toHaveLength(2);
  });

  test('highlights field used in multiple commands', () => {
    const query = 'FROM index | EVAL x = name | WHERE name != "" | SORT name';
    const highlights = getHighlights(query, 'name');
    expect(highlights).toHaveLength(3);
  });

  test('returns empty when cursor is on a source', () => {
    const highlights = getHighlights('FROM index | WHERE field1 > 10', 'index');
    expect(highlights).toEqual([]);
  });

  test('returns empty when cursor is on a function', () => {
    const highlights = getHighlights('FROM index | STATS count() BY field1', 'count');
    expect(highlights).toEqual([]);
  });
});
