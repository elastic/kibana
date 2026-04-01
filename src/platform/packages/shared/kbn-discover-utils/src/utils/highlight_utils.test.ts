/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeAndPreserveHighlightTags, getHighlightedFieldValue } from './highlight_utils';

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

  it('escapes ES highlight tags as plain text (not converted)', () => {
    expect(escapeAndPreserveHighlightTags(`${ES_PRE}test${ES_POST}`)).toBe(
      `${ES_PRE}test${ES_POST}`
    );
  });
});

describe('getHighlightedFieldValue', () => {
  it('escapes the field value when no highlights are provided', () => {
    expect(getHighlightedFieldValue('<hello>', undefined)).toBe('&lt;hello&gt;');
  });

  it('escapes the field value when highlights is an empty array', () => {
    expect(getHighlightedFieldValue('<hello>', [])).toBe('&lt;hello&gt;');
  });

  it('replaces matching text with highlighted version from a single snippet', () => {
    expect(
      getHighlightedFieldValue('This is a test message', [
        `This is a ${ES_PRE}test${ES_POST} message`,
      ])
    ).toBe(`This is a ${PRE}test${POST} message`);
  });

  it('handles multiple highlight regions within a single snippet', () => {
    expect(
      getHighlightedFieldValue('hello world', [`${ES_PRE}hello${ES_POST} ${ES_PRE}world${ES_POST}`])
    ).toBe(`${PRE}hello${POST} ${PRE}world${POST}`);
  });

  it('applies highlights from multiple snippets for multi-valued fields', () => {
    expect(
      getHighlightedFieldValue('error in service A, warning in service B', [
        `${ES_PRE}error${ES_POST} in service A`,
        `${ES_PRE}warning${ES_POST} in service B`,
      ])
    ).toBe(`${PRE}error${POST} in service A, ${PRE}warning${POST} in service B`);
  });

  it('escapes HTML in the field value while preserving highlight tags', () => {
    expect(getHighlightedFieldValue('<b>test</b>', [`${ES_PRE}<b>test</b>${ES_POST}`])).toBe(
      `${PRE}&lt;b&gt;test&lt;/b&gt;${POST}`
    );
  });

  it('returns escaped value when highlights do not match field text', () => {
    expect(getHighlightedFieldValue('no match here', [`${ES_PRE}other text${ES_POST}`])).toBe(
      'no match here'
    );
  });
});
