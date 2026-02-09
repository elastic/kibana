/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TruncateFormat } from './truncate';
import { HTML_CONTEXT_TYPE, TEXT_CONTEXT_TYPE } from '../content_types';

describe('String TruncateFormat', () => {
  test('truncate large string', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convert('This is some text')).toBe('This...');
  });

  test('does not truncate large string when field length is not a string', () => {
    const truncate = new TruncateFormat({ fieldLength: 'not number' }, jest.fn());

    expect(truncate.convert('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length is null', () => {
    const truncate = new TruncateFormat({ fieldLength: null }, jest.fn());

    expect(truncate.convert('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length larger than the text', () => {
    const truncate = new TruncateFormat({ fieldLength: 100000 }, jest.fn());

    expect(truncate.convert('This is some text')).toBe('This is some text');
  });

  test('does not truncate whole text when non integer is passed in', () => {
    // https://github.com/elastic/kibana/issues/29648
    const truncate = new TruncateFormat({ fieldLength: 3.2 }, jest.fn());

    expect(truncate.convert('This is some text')).toBe('Thi...');
  });

  test('missing value', () => {
    const truncate = new TruncateFormat({ fieldLength: 3.2 }, jest.fn());

    expect(truncate.convert(null, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(truncate.convert(undefined, TEXT_CONTEXT_TYPE)).toBe('(null)');
    expect(truncate.convert('', TEXT_CONTEXT_TYPE)).toBe('(blank)');
    expect(truncate.convert(null, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(truncate.convert(undefined, HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(null)</span>'
    );
    expect(truncate.convert('', HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffString__emptyValue">(blank)</span>'
    );
  });
});
