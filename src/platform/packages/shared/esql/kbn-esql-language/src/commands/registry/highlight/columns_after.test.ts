/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { Parser } from '@elastic/esql';
import type { ESQLAstHighlightCommand, ESQLCommand } from '@elastic/esql/types';
import type { ESQLColumnData } from '../types';
import { columnsAfter } from './columns_after';

const makeCommand = (fields: string[], prefix?: string): ESQLAstHighlightCommand =>
  ({
    name: 'highlight',
    highlightFields: fields.map((name) => ({ name, type: 'column', incomplete: false })),
    prefix:
      prefix !== undefined
        ? { valueUnquoted: prefix, value: `"${prefix}"`, type: 'literal', literalType: 'keyword' }
        : undefined,
    args: [],
    location: { min: 0, max: 0 },
    incomplete: false,
  } as unknown as ESQLAstHighlightCommand);

describe('HIGHLIGHT > columnsAfter', () => {
  it('appends one highlight_ column per ON field with default prefix', () => {
    const result = columnsAfter(makeCommand(['title', 'body']), []);

    expect(result.map((c) => c.name)).toEqual(['highlight_title', 'highlight_body']);
    expect(result.every((c) => c.type === 'keyword' && !c.userDefined)).toBe(true);
  });

  it('applies a custom prefix to the generated columns', () => {
    const result = columnsAfter(makeCommand(['title'], 'hl_'), []);

    expect(result.map((c) => c.name)).toEqual(['hl_title']);
  });

  it('preserves previous columns and appends highlight columns after them', () => {
    const previous: ESQLColumnData[] = [{ name: 'count', type: 'integer', userDefined: false }];
    const result = columnsAfter(makeCommand(['title']), previous);

    expect(result.map((c) => c.name)).toEqual(['count', 'highlight_title']);
  });

  it('replaces an existing column when the prefix produces the same name (collision)', () => {
    // highlight_ prefix + field "count" would produce "highlight_count" — no collision here
    // But empty prefix + field "title" = "title" overwrites the source column
    const previous: ESQLColumnData[] = [{ name: 'title', type: 'text', userDefined: false }];
    const result = columnsAfter(makeCommand(['title'], ''), previous);

    // Only one "title" column should exist, and it should be type keyword (the highlight output)
    const titleColumns = result.filter((c) => c.name === 'title');
    expect(titleColumns).toHaveLength(1);
    expect(titleColumns[0].type).toBe('keyword');
  });

  it('returns empty columns when no ON fields are specified', () => {
    const previous: ESQLColumnData[] = [{ name: 'count', type: 'integer', userDefined: false }];
    const result = columnsAfter(makeCommand([]), previous);

    expect(result.map((c) => c.name)).toEqual(['count']);
  });

  describe('derived fields', () => {
    const previousColumns: ESQLColumnData[] = [
      { name: 'title', type: 'text', userDefined: false },
      { name: 'author', type: 'keyword', userDefined: false },
      { name: 'body', type: 'semantic_text', userDefined: false },
      { name: 'year', type: 'integer', userDefined: false },
      { name: '_id', type: 'keyword', userDefined: false },
    ];

    const getGeneratedColumns = (query: string): string[] => {
      const { root } = Parser.parse(query);
      const command = root.commands.find(({ name }) => name === 'highlight') as ESQLCommand;

      return columnsAfter(command, previousColumns)
        .map(({ name }) => name)
        .filter((name) => name.startsWith('highlight_'));
    };

    it('expands ON * to the text, keyword and semantic_text columns, without metadata', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT "fox" ON *')).toEqual([
        'highlight_title',
        'highlight_author',
        'highlight_body',
      ]);
    });

    it('highlights the field a field-targeting query searches when ON is omitted', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT MATCH(title, "fox")')).toEqual([
        'highlight_title',
      ]);
      expect(getGeneratedColumns('FROM a | HIGHLIGHT author : "fox"')).toEqual([
        'highlight_author',
      ]);
    });

    it('highlights every text column when a field-targeting query is combined with one that names no field', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT MATCH(title, "fox") AND QSTR("x")')).toEqual([
        'highlight_title',
        'highlight_author',
        'highlight_body',
      ]);
      expect(getGeneratedColumns('FROM a | HIGHLIGHT MATCH(title, "fox") OR "x"')).toHaveLength(3);
    });

    it('keeps narrowing to the named fields next to a negated condition', () => {
      expect(
        getGeneratedColumns('FROM a | HIGHLIGHT MATCH(title, "fox") AND NOT MATCH(author, "x")')
      ).toEqual(['highlight_title']);
      expect(
        getGeneratedColumns('FROM a | HIGHLIGHT MATCH(title, "fox") AND NOT QSTR("x")')
      ).toHaveLength(3);
    });

    it('highlights every text column when the query targets a parameter', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT MATCH(?field, "fox")')).toHaveLength(3);
      expect(getGeneratedColumns('FROM a | HIGHLIGHT ??field : "fox"')).toHaveLength(3);
    });

    it('leaves out a named field that is not a text column of the input', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT MATCH(year, "1") AND title : "x"')).toEqual([
        'highlight_title',
      ]);
    });

    it('highlights every text and keyword column for a query that targets no field', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT "fox"')).toEqual([
        'highlight_title',
        'highlight_author',
        'highlight_body',
      ]);
      expect(getGeneratedColumns('FROM a | HIGHLIGHT QSTR("fox")')).toHaveLength(3);
    });

    it('generates the columns an earlier WHERE marked when both the query and ON are omitted', () => {
      const markedColumns = previousColumns.map((column) =>
        column.name === 'title' ? { ...column, fullTextMatch: 'field' as const } : column
      );
      const { root } = Parser.parse('FROM a | HIGHLIGHT');
      const command = root.commands.find(({ name }) => name === 'highlight') as ESQLCommand;

      expect(
        columnsAfter(command, markedColumns)
          .map(({ name }) => name)
          .filter((name) => name.startsWith('highlight_'))
      ).toEqual(['highlight_title']);
    });

    it('generates nothing when both the query and ON are omitted and nothing is marked', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT')).toEqual([]);
    });

    it('uses the prefix for the derived columns', () => {
      expect(
        getGeneratedColumns('FROM a | HIGHLIGHT prefix = "highlight_x_" "fox" ON title')
      ).toEqual(['highlight_x_title']);
    });

    it('does not generate columns for a parameter or an invalid pattern', () => {
      expect(getGeneratedColumns('FROM a | HIGHLIGHT "fox" ON ?field')).toEqual([]);
      expect(getGeneratedColumns('FROM a | HIGHLIGHT "fox" ON title*')).toEqual([]);
    });
  });
});
