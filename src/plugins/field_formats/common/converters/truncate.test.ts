/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TruncateFormat } from './truncate';

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
});
