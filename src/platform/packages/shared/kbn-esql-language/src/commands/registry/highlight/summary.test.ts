/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { ESQLAstHighlightCommand } from '@elastic/esql/types';
import { summary } from './summary';

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

describe('HIGHLIGHT > summary', () => {
  it('returns one highlight_ column per ON field with the default prefix', () => {
    const result = summary(makeCommand(['title', 'body']), '');

    expect(result).toEqual({ newColumns: new Set(['highlight_title', 'highlight_body']) });
  });

  it('applies a custom prefix to the new column names', () => {
    const result = summary(makeCommand(['title'], 'hl_'), '');

    expect(result).toEqual({ newColumns: new Set(['hl_title']) });
  });

  it('returns an empty set when no ON fields are specified', () => {
    const result = summary(makeCommand([]), '');

    expect(result).toEqual({ newColumns: new Set() });
  });
});
