/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstHighlightCommand } from '@elastic/esql/types';
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
});
