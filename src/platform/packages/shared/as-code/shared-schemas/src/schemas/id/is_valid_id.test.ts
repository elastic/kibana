/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isValidId } from './is_valid_id';

describe('isValidId', () => {
  it('returns true for valid markdown IDs', () => {
    expect(isValidId('test-markdown-id')).toBe(true);
    expect(isValidId('test_markdown_id')).toBe(true);
    expect(isValidId('test123')).toBe(true);
    expect(isValidId('a')).toBe(true);
    expect(isValidId('123')).toBe(true);
    expect(isValidId('a-')).toBe(true);
    expect(isValidId('-a')).toBe(true);
    expect(isValidId('a_')).toBe(true);
    expect(isValidId('_a')).toBe(true);
    expect(isValidId('test-markdown-id-')).toBe(true);
    expect(isValidId('test-markdown-id_')).toBe(true);
    expect(isValidId('----test-markdown-id')).toBe(true);
    expect(isValidId('____test-markdown-id')).toBe(true);
  });
  it('returns false for invalid markdown IDs', () => {
    expect(isValidId('')).toBe(false);
    expect(isValidId(' ')).toBe(false);
    expect(isValidId('a ')).toBe(false);
    expect(isValidId('Test-Markdown-Id')).toBe(false);
    expect(isValidId('Test_Markdown_Id')).toBe(false);
    expect(isValidId('Test123')).toBe(false);
    expect(isValidId('test-markdown-id.')).toBe(false);
    expect(isValidId('test-markdown-id#')).toBe(false);
    expect(isValidId('test-markdown-id/')).toBe(false);
    expect(isValidId('test-markdown-id@')).toBe(false);
    expect(isValidId('test-markdown-id$')).toBe(false);
    expect(isValidId('test-markdown-id%')).toBe(false);
    expect(isValidId('test-markdown-id^')).toBe(false);
    expect(isValidId('test-markdown-id&')).toBe(false);
  });
});
