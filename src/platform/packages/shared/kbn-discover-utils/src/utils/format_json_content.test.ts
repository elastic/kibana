/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { tryFormatJsonContent } from './format_json_content';

describe('tryFormatJsonContent', () => {
  it('returns undefined when the value is undefined or null', () => {
    expect(tryFormatJsonContent(undefined)).toBeUndefined();
    expect(tryFormatJsonContent(null)).toBeUndefined();
  });

  it('returns undefined for a value that contains no JSON, regardless of length', () => {
    expect(tryFormatJsonContent('a short message')).toBeUndefined();
    expect(tryFormatJsonContent('a plain log line '.repeat(50))).toBeUndefined();
    expect(tryFormatJsonContent(55)).toBeUndefined();
    expect(tryFormatJsonContent(true)).toBeUndefined();
  });

  it('pretty-prints valid JSON values', () => {
    const json = { a: 1, b: { c: 2 } };

    expect(tryFormatJsonContent(JSON.stringify(json))).toBe(JSON.stringify(json, null, 2));
  });

  it('pretty-prints JSON embedded in surrounding text', () => {
    expect(
      tryFormatJsonContent('[Error] Some log message: { "reason": "some failure reason" }')
    ).toBe('[Error] Some log message:\n{\n  "reason": "some failure reason"\n}');
  });

  it('pretty-prints embedded JSON arrays', () => {
    expect(tryFormatJsonContent('items: [1,2,3]')).toBe('items:\n[\n  1,\n  2,\n  3\n]');
  });

  it('pretty-prints multiple interleaved JSON blocks preserving order', () => {
    expect(tryFormatJsonContent('[Error] foo: { "a": 1 } then bar: { "b": 2 } done')).toBe(
      ['[Error] foo:', '{\n  "a": 1\n}', 'then bar:', '{\n  "b": 2\n}', 'done'].join('\n')
    );
  });

  it('handles braces and brackets inside JSON string values', () => {
    expect(tryFormatJsonContent('log { "text": "has } and ] and { inside" } tail')).toBe(
      'log\n{\n  "text": "has } and ] and { inside"\n}\ntail'
    );
  });

  it('handles escaped quotes inside JSON string values', () => {
    expect(tryFormatJsonContent('log { "text": "a \\" quote" } tail')).toBe(
      'log\n{\n  "text": "a \\" quote"\n}\ntail'
    );
  });

  it('does not detect plain bracketed text or empty objects as JSON', () => {
    expect(tryFormatJsonContent('[Error] something happened')).toBeUndefined();
    expect(tryFormatJsonContent('a {not json} value')).toBeUndefined();
    expect(tryFormatJsonContent('unbalanced { "a": 1 ')).toBeUndefined();
    expect(tryFormatJsonContent('empty {} and []')).toBeUndefined();
  });
});
