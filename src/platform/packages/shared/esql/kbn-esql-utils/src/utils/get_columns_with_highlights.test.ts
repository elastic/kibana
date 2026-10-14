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
    expect(getColumnsWithHighlights(query)).toEqual({
      snippets: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('returns custom pre_tag and post_tag from TOP_SNIPPETS options', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })';
    expect(getColumnsWithHighlights(query)).toEqual({
      snippets: {
        preTag: '<mark>',
        postTag: '</mark>',
      },
    });
  });

  it('ignores TOP_SNIPPETS without highlight option', () => {
    const query = 'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien")';
    expect(getColumnsWithHighlights(query)).toEqual({});
  });

  it('returns multiple columns with their respective tags', () => {
    const query =
      'FROM books | EVAL a = TOP_SNIPPETS(description, "one", { "highlight": true }) | EVAL b = TOP_SNIPPETS(title, "two", { "highlight": true, "pre_tag": "<mark>", "post_tag": "</mark>" })';
    expect(getColumnsWithHighlights(query)).toEqual({
      a: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
      b: {
        preTag: '<mark>',
        postTag: '</mark>',
      },
    });
  });

  it('handles EVAL unamed columns scenarios', () => {
    const query = 'FROM books | EVAL TOP_SNIPPETS(description, "one", { "highlight": true })';
    expect(getColumnsWithHighlights(query)).toEqual({
      'TOP_SNIPPETS(description, "one", { "highlight": true })': {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('handles STATS user defined columns', () => {
    const query =
      'FROM books | STATS count(*) BY col0 = TOP_SNIPPETS(description, "one", { "highlight": true })';
    expect(getColumnsWithHighlights(query)).toEqual({
      col0: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('handles STATS unamed user defined columns', () => {
    const query =
      'FROM books | STATS count(*) BY TOP_SNIPPETS(description, "one", { "highlight": true })';
    expect(getColumnsWithHighlights(query)).toEqual({
      'TOP_SNIPPETS(description, "one", { "highlight": true })': {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('applies RENAME to resolved highlight column names', () => {
    const query =
      'FROM books | EVAL col0 = TOP_SNIPPETS(description, "one", { "highlight": true }) | RENAME col0 AS renamed';
    expect(getColumnsWithHighlights(query)).toEqual({
      renamed: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('can handle columns defined within quotes', () => {
    const query =
      'FROM books | EVAL `col0` = TOP_SNIPPETS(description, "one", { "highlight": true })';
    expect(getColumnsWithHighlights(query)).toEqual({
      col0: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('returns HIGHLIGHT command columns with the default prefix and em tags', () => {
    const query = 'FROM books | HIGHLIGHT "Tolkien" ON title';
    expect(getColumnsWithHighlights(query)).toEqual({
      highlight_title: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('uses the response columns that start with the prefix for ON *', () => {
    const query = 'FROM books | HIGHLIGHT "Tolkien" ON *';
    expect(
      Object.keys(
        getColumnsWithHighlights(query, ['title', 'highlight_title', 'highlight_description'])
      )
    ).toEqual(['highlight_title', 'highlight_description']);
  });

  it('uses the response columns that start with the prefix when ON is omitted', () => {
    const query = 'FROM books | WHERE MATCH(title, "Tolkien") | HIGHLIGHT prefix = "hl_"';
    expect(
      Object.keys(getColumnsWithHighlights(query, ['title', 'hl_title', 'highlight_title']))
    ).toEqual(['hl_title']);
  });

  it('follows a RENAME of a derived highlight column', () => {
    const query =
      'FROM books | HIGHLIGHT "Tolkien" ON * | RENAME highlight_title AS hl | RENAME hl AS h';
    expect(
      Object.keys(getColumnsWithHighlights(query, ['title', 'h', 'highlight_body'])).sort()
    ).toEqual(['h', 'highlight_body']);
  });

  it('keeps a generated column that a later HIGHLIGHT recreates after a RENAME', () => {
    const query =
      'FROM books | HIGHLIGHT "Tolkien" ON * | RENAME highlight_title AS h | HIGHLIGHT "Ring" ON *';
    expect(
      Object.keys(getColumnsWithHighlights(query, ['title', 'h', 'highlight_title'])).sort()
    ).toEqual(['h', 'highlight_title']);
  });

  it('uses the field a field-targeting query names when ON is omitted', () => {
    expect(
      Object.keys(getColumnsWithHighlights('FROM books | HIGHLIGHT MATCH(title, "Tolkien")'))
    ).toEqual(['highlight_title']);
  });

  it('styles the source column a field-targeting query overwrites with an empty prefix', () => {
    const query = 'FROM books | HIGHLIGHT prefix = "" title : "Tolkien"';
    expect(Object.keys(getColumnsWithHighlights(query, ['title', 'author']))).toEqual(['title']);
  });

  it('uses the response columns when an omitted-ON query targets a parameter', () => {
    for (const query of [
      'FROM books | HIGHLIGHT MATCH(?field, "Tolkien")',
      'FROM books | HIGHLIGHT ??field : "Tolkien"',
    ]) {
      expect(Object.keys(getColumnsWithHighlights(query, ['title', 'highlight_title']))).toEqual([
        'highlight_title',
      ]);
    }
  });

  it('cannot tell the derived columns apart when the prefix is empty', () => {
    const query = 'FROM books | HIGHLIGHT prefix = "" "Tolkien" ON *';
    expect(getColumnsWithHighlights(query, ['title', 'description'])).toEqual({});
  });

  it('ignores parameter and invalid pattern ON fields', () => {
    const query = 'FROM books | HIGHLIGHT "Tolkien" ON title, desc*, ?field';
    expect(Object.keys(getColumnsWithHighlights(query, ['highlight_desc']))).toEqual([
      'highlight_title',
    ]);
  });

  it('returns one HIGHLIGHT column per ON field', () => {
    const query = 'FROM books | HIGHLIGHT "Tolkien" ON title, description';
    expect(getColumnsWithHighlights(query)).toEqual({
      highlight_title: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
      highlight_description: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('applies a custom HIGHLIGHT prefix to generated column names', () => {
    const query = 'FROM books | HIGHLIGHT prefix = "hl_" "Tolkien" ON title';
    expect(getColumnsWithHighlights(query)).toEqual({
      hl_title: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('overwrites the source column when HIGHLIGHT prefix is empty', () => {
    const query = 'FROM books | HIGHLIGHT prefix = "" "Tolkien" ON title';
    expect(getColumnsWithHighlights(query)).toEqual({
      title: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });

  it('uses the first HIGHLIGHT pre_tags and post_tags values', () => {
    const query =
      'FROM books | HIGHLIGHT "Tolkien" ON title WITH { "pre_tags": ["<mark>"], "post_tags": ["</mark>"] }';
    expect(getColumnsWithHighlights(query)).toEqual({
      highlight_title: {
        preTag: '<mark>',
        postTag: '</mark>',
      },
    });
  });

  it('combines TOP_SNIPPETS and HIGHLIGHT columns from the same query', () => {
    const query =
      'FROM books | EVAL snippets = TOP_SNIPPETS(description, "Tolkien", { "highlight": true }) | HIGHLIGHT "Tolkien" ON title';
    expect(getColumnsWithHighlights(query)).toEqual({
      snippets: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
      highlight_title: {
        preTag: DEFAULT_HIGHLIGHT_PRE_TAG,
        postTag: DEFAULT_HIGHLIGHT_POST_TAG,
      },
    });
  });
});
