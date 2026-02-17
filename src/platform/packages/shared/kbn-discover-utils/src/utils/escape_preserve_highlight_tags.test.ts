/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeAndPreserveHighlightTags } from './escape_preserve_highlight_tags';

describe('escapeAndPreserveHighlightTags', () => {
  it('escapes HTML when there are no <mark> tags', () => {
    expect(escapeAndPreserveHighlightTags('<hello>world</hello>')).toBe(
      '&lt;hello&gt;world&lt;/hello&gt;'
    );
  });

  it('preserves <mark> wrappers while escaping the content', () => {
    expect(escapeAndPreserveHighlightTags('<mark><hello></mark>')).toBe(
      '<mark>&lt;hello&gt;</mark>'
    );
  });

  it('returns only escaped text when there are multiple <mark> regions', () => {
    expect(escapeAndPreserveHighlightTags('<mark>hello</mark> + <mark>world</mark>')).toBe(
      'hello + world'
    );
  });
});
