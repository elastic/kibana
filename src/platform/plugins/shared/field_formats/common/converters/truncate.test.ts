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
import {
  expectReactElementWithNull,
  expectReactElementWithBlank,
  expectReactElementAsArray,
} from '../test_utils';

describe('String TruncateFormat', () => {
  test('truncate large string', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convert('This is some text', TEXT_CONTEXT_TYPE)).toBe('This...');
    expect(truncate.convert('This is some text', HTML_CONTEXT_TYPE)).toBe('This...');
    expect(truncate.reactConvert('This is some text')).toBe('This...');
  });

  test('does not truncate large string when field length is not a string', () => {
    const truncate = new TruncateFormat({ fieldLength: 'not number' }, jest.fn());

    expect(truncate.convert('This is some text', TEXT_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.convert('This is some text', HTML_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.reactConvert('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length is null', () => {
    const truncate = new TruncateFormat({ fieldLength: null }, jest.fn());

    expect(truncate.convert('This is some text', TEXT_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.convert('This is some text', HTML_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.reactConvert('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length larger than the text', () => {
    const truncate = new TruncateFormat({ fieldLength: 100000 }, jest.fn());

    expect(truncate.convert('This is some text', TEXT_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.convert('This is some text', HTML_CONTEXT_TYPE)).toBe('This is some text');
    expect(truncate.reactConvert('This is some text')).toBe('This is some text');
  });

  test('does not truncate whole text when non integer is passed in', () => {
    // https://github.com/elastic/kibana/issues/29648
    const truncate = new TruncateFormat({ fieldLength: 3.2 }, jest.fn());

    expect(truncate.convert('This is some text', TEXT_CONTEXT_TYPE)).toBe('Thi...');
    expect(truncate.convert('This is some text', HTML_CONTEXT_TYPE)).toBe('Thi...');
    expect(truncate.reactConvert('This is some text')).toBe('Thi...');
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
    expectReactElementWithNull(truncate.reactConvert(null));
    expectReactElementWithNull(truncate.reactConvert(undefined));
    expectReactElementWithBlank(truncate.reactConvert(''));
  });

  test('escapes HTML characters in html context', () => {
    const truncate = new TruncateFormat({ fieldLength: 100 }, jest.fn());

    expect(truncate.convert('<script>alert("test")</script>', HTML_CONTEXT_TYPE)).toBe(
      '&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;'
    );
    expect(truncate.convert('<img src="x" onerror="alert(1)">', HTML_CONTEXT_TYPE)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
    );
    expect(truncate.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
    expect(truncate.reactConvert('<img src="x" onerror="alert(1)">')).toBe(
      '<img src="x" onerror="alert(1)">'
    );
  });

  test('escapes HTML characters in truncated html context', () => {
    const truncate = new TruncateFormat({ fieldLength: 10 }, jest.fn());

    expect(truncate.convert('<script>alert("test")</script>', HTML_CONTEXT_TYPE)).toBe(
      '&lt;script&gt;al...'
    );
    expect(truncate.reactConvert('<script>alert("test")</script>')).toBe('<script>al...');
  });

  test('does not escape HTML characters in text context', () => {
    const truncate = new TruncateFormat({ fieldLength: 100 }, jest.fn());

    expect(truncate.convert('<script>alert("test")</script>', TEXT_CONTEXT_TYPE)).toBe(
      '<script>alert("test")</script>'
    );
    expect(truncate.reactConvert('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convert(['hello world', 'foo bar'], TEXT_CONTEXT_TYPE)).toBe(
      '["hell...","foo bar"]'
    );
    expect(truncate.convert(['hello world', 'foo bar'], HTML_CONTEXT_TYPE)).toBe(
      '<span class="ffArray__highlight">[</span>hell...<span class="ffArray__highlight">,</span> foo bar<span class="ffArray__highlight">]</span>'
    );
    expectReactElementAsArray(truncate.reactConvert(['hello world', 'foo bar']), [
      'hell...',
      'foo bar',
    ]);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convert(['hello world'], TEXT_CONTEXT_TYPE)).toBe('["hell..."]');
    expect(truncate.convert(['hello world'], HTML_CONTEXT_TYPE)).toBe('hell...');
    expect(truncate.reactConvert(['hello world'])).toBe('hell...');
  });
});
