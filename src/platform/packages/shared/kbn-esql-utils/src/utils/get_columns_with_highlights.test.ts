/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DEFAULT_HIGHLIGHT_POST_TAG,
  DEFAULT_HIGHLIGHT_PRE_TAG,
  getColumnsWithHighlights,
} from './get_columns_with_highlights';

describe('getColumnsWithHighlights', () => {
  it('returns column with default em tags when highlight is enabled', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true })';
    expect(getColumnsWithHighlights(query)).toEqual([
      {
        column: 'snippets',
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    ]);
  });

  it('returns custom pre_tag and post_tag from TOP_SNIPPETS options', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })';
    expect(getColumnsWithHighlights(query)).toEqual([
      {
        column: 'snippets',
        preTag: '<mark>',
        postTag: '</mark>',
      },
    ]);
  });

  it('ignores TOP_SNIPPETS without highlight option', () => {
    const query = 'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien")';
    expect(getColumnsWithHighlights(query)).toEqual([]);
  });

  it('returns multiple columns with their respective tags', () => {
    const query =
      'FROM books | EVAL a = TOP_SNIPPETS(description, "one", { "highlight": true }) | EVAL b = TOP_SNIPPETS(title, "two", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })';
    expect(getColumnsWithHighlights(query)).toEqual([
      {
        column: 'a',
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
      {
        column: 'b',
        preTag: '<mark>',
        postTag: '</mark>',
      },
    ]);
  });
});
