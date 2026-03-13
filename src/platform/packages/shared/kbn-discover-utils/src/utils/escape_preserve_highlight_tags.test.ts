/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeAndPreserveHighlightTags } from './escape_preserve_highlight_tags';

// Must match the html tags defined in @kbn/field-formats-plugin (html_tags.ts)
const PRE = '<mark class="ffSearch__highlight">';
const POST = '</mark>';

describe('escapeAndPreserveHighlightTags', () => {
  it('escapes HTML when there are no highlight tags', () => {
    expect(escapeAndPreserveHighlightTags('<hello>world</hello>')).toBe(
      '&lt;hello&gt;world&lt;/hello&gt;'
    );
  });

  it('preserves highlight wrappers while escaping the content', () => {
    expect(escapeAndPreserveHighlightTags(`${PRE}<hello>${POST}`)).toBe(
      `${PRE}&lt;hello&gt;${POST}`
    );
  });

  it('returns only escaped text when there are multiple highlight regions', () => {
    expect(escapeAndPreserveHighlightTags(`${PRE}hello${POST} + ${PRE}world${POST}`)).toBe(
      'hello + world'
    );
  });

  it('escapes plain <mark> tags that do not match the highlight format', () => {
    expect(escapeAndPreserveHighlightTags('<mark><hello></mark>')).toBe(
      '&lt;mark&gt;&lt;hello&gt;'
    );
  });
});
