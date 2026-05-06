/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TruncateFormat } from './truncate';
import {
  expectReactElementWithNull,
  expectReactElementWithBlank,
  expectReactElementAsArray,
} from '../test_utils';

describe('String TruncateFormat', () => {
  test('truncate large string', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convertToText('This is some text')).toBe('This...');
    expect(truncate.convertToReact('This is some text')).toBe('This...');
  });

  test('does not truncate large string when field length is not a string', () => {
    const truncate = new TruncateFormat({ fieldLength: 'not number' }, jest.fn());

    expect(truncate.convertToText('This is some text')).toBe('This is some text');
    expect(truncate.convertToReact('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length is null', () => {
    const truncate = new TruncateFormat({ fieldLength: null }, jest.fn());

    expect(truncate.convertToText('This is some text')).toBe('This is some text');
    expect(truncate.convertToReact('This is some text')).toBe('This is some text');
  });

  test('does not truncate large string when field length larger than the text', () => {
    const truncate = new TruncateFormat({ fieldLength: 100000 }, jest.fn());

    expect(truncate.convertToText('This is some text')).toBe('This is some text');
    expect(truncate.convertToReact('This is some text')).toBe('This is some text');
  });

  test('does not truncate whole text when non integer is passed in', () => {
    // https://github.com/elastic/kibana/issues/29648
    const truncate = new TruncateFormat({ fieldLength: 3.2 }, jest.fn());

    expect(truncate.convertToText('This is some text')).toBe('Thi...');
    expect(truncate.convertToReact('This is some text')).toBe('Thi...');
  });

  test('missing value', () => {
    const truncate = new TruncateFormat({ fieldLength: 3.2 }, jest.fn());

    expect(truncate.convertToText(null)).toBe('(null)');
    expect(truncate.convertToText(undefined)).toBe('(null)');
    expect(truncate.convertToText('')).toBe('(blank)');
    expectReactElementWithNull(truncate.convertToReact(null));
    expectReactElementWithNull(truncate.convertToReact(undefined));
    expectReactElementWithBlank(truncate.convertToReact(''));
  });

  test('convertToReact passes through HTML-like content', () => {
    const truncate = new TruncateFormat({ fieldLength: 100 }, jest.fn());

    expect(truncate.convertToReact('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
    expect(truncate.convertToReact('<img src="x" onerror="alert(1)">')).toBe(
      '<img src="x" onerror="alert(1)">'
    );
  });

  test('convertToReact truncates HTML-like content without escaping', () => {
    const truncate = new TruncateFormat({ fieldLength: 10 }, jest.fn());

    expect(truncate.convertToReact('<script>alert("test")</script>')).toBe('<script>al...');
  });

  test('does not escape HTML characters in text context', () => {
    const truncate = new TruncateFormat({ fieldLength: 100 }, jest.fn());

    expect(truncate.convertToText('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
    expect(truncate.convertToReact('<script>alert("test")</script>')).toBe(
      '<script>alert("test")</script>'
    );
  });

  test('wraps a multi-value array with bracket notation', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convertToText(['hello world', 'foo bar'])).toBe(
      '["hell...","foo bar"]'
    );
    expectReactElementAsArray(truncate.convertToReact(['hello world', 'foo bar']), [
      'hell...',
      'foo bar',
    ]);
  });

  test('returns the single element without brackets for a one-element array', () => {
    const truncate = new TruncateFormat({ fieldLength: 4 }, jest.fn());

    expect(truncate.convertToText(['hello world'])).toBe('["hell..."]');
    expect(truncate.convertToReact(['hello world'])).toBe('hell...');
  });
});
