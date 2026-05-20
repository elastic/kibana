/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getColumnsToHighlight } from './get_columns_to_highlight';

describe('getColumnsToHighlight', () => {
  it('returns columns assigned from TOP_SNIPPETS with highlight enabled', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })';
    expect(getColumnsToHighlight(query)).toEqual(new Set(['snippets']));
  });

  it('returns columns from STATS and ROW assignments with highlight enabled', () => {
    expect(
      getColumnsToHighlight(
        'FROM books | STATS s = TOP_SNIPPETS(description, "Tolkien", { "highlight": true }) BY author'
      )
    ).toEqual(new Set(['s']));
    expect(
      getColumnsToHighlight('ROW r = TOP_SNIPPETS("text", "q", { "highlight": true })')
    ).toEqual(new Set(['r']));
  });

  it('returns multiple TOP_SNIPPETS output columns when highlight is enabled', () => {
    const query =
      'FROM books | EVAL a = TOP_SNIPPETS(description, "one", { "highlight": true }) | EVAL b = TOP_SNIPPETS(title, "two", { "highlight": true })';
    expect(getColumnsToHighlight(query)).toEqual(new Set(['a', 'b']));
  });

  it('ignores TOP_SNIPPETS without highlight option', () => {
    const query = 'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien")';
    expect(getColumnsToHighlight(query)).toEqual(new Set());
  });

  it('ignores TOP_SNIPPETS with highlight set to false', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": false })';
    expect(getColumnsToHighlight(query)).toEqual(new Set());
  });

  it('ignores TOP_SNIPPETS with other options but no highlight', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "num_words": 25 })';
    expect(getColumnsToHighlight(query)).toEqual(new Set());
  });

  it('ignores TOP_SNIPPETS used only in RERANK ON clause', () => {
    const query =
      'FROM books | RERANK "Tolkien" ON TOP_SNIPPETS(description, "Tolkien", { "highlight": true }) WITH { "inference_id": "x" }';
    expect(getColumnsToHighlight(query)).toEqual(new Set());
  });

  it('returns an empty set when TOP_SNIPPETS is not used', () => {
    const query = 'FROM books | KEEP title';
    expect(getColumnsToHighlight(query)).toEqual(new Set());
  });
});
