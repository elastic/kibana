/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { htmlTags } from '@kbn/field-formats-plugin/common/utils/highlight/html_tags';
import { escapeAndPreserveHighlightTags } from './escape_preserve_highlight_tags';

describe('escapeAndPreserveHighlightTags', () => {
  it('escapes HTML when there are no highlight tags', () => {
    expect(escapeAndPreserveHighlightTags('<hello>world</hello>')).toBe(
      '&lt;hello&gt;world&lt;/hello&gt;'
    );
  });

  it('preserves highlight wrappers while escaping the content', () => {
    expect(escapeAndPreserveHighlightTags(`${htmlTags.pre}<hello>${htmlTags.post}`)).toBe(
      `${htmlTags.pre}&lt;hello&gt;${htmlTags.post}`
    );
  });

  it('returns only escaped text when there are multiple highlight regions', () => {
    expect(
      escapeAndPreserveHighlightTags(
        `${htmlTags.pre}hello${htmlTags.post} + ${htmlTags.pre}world${htmlTags.post}`
      )
    ).toBe('hello + world');
  });

  it('escapes plain <mark> tags that do not match the highlight format', () => {
    expect(escapeAndPreserveHighlightTags('<mark><hello></mark>')).toBe(
      '&lt;mark&gt;&lt;hello&gt;'
    );
  });
});
