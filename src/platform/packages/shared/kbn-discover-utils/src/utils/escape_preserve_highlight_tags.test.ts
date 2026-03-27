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

// Must match the tags defined in @kbn/field-formats-plugin (highlight_tags.ts)
const ES_PRE = '@kibana-highlighted-field@';
const ES_POST = '@/kibana-highlighted-field@';

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

  it('preserves multiple highlight regions', () => {
    expect(escapeAndPreserveHighlightTags(`${PRE}hello${POST} + ${PRE}world${POST}`)).toBe(
      `${PRE}hello${POST} + ${PRE}world${POST}`
    );
  });

  it('escapes plain <mark> tags that do not match the highlight format', () => {
    expect(escapeAndPreserveHighlightTags('<mark><hello></mark>')).toBe(
      '&lt;mark&gt;&lt;hello&gt;&lt;/mark&gt;'
    );
  });

  it('converts ES highlight tags to HTML mark tags with a single match', () => {
    expect(escapeAndPreserveHighlightTags(`This is a ${ES_PRE}test${ES_POST} message`)).toBe(
      `This is a ${PRE}test${POST} message`
    );
  });

  it('converts ES highlight tags to HTML mark tags with multiple matches', () => {
    expect(
      escapeAndPreserveHighlightTags(`${ES_PRE}hello${ES_POST} and ${ES_PRE}world${ES_POST}`)
    ).toBe(`${PRE}hello${POST} and ${PRE}world${POST}`);
  });

  it('escapes HTML characters in non-highlighted text around ES tags', () => {
    expect(escapeAndPreserveHighlightTags(`<b>${ES_PRE}test${ES_POST}</b>`)).toBe(
      `&lt;b&gt;${PRE}test${POST}&lt;/b&gt;`
    );
  });

  it('escapes HTML characters inside ES highlighted text', () => {
    expect(escapeAndPreserveHighlightTags(`${ES_PRE}<script>${ES_POST}`)).toBe(
      `${PRE}&lt;script&gt;${POST}`
    );
  });
});
