/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateMarkdownId } from './validate_markdown_id';

describe('validateMarkdownId', () => {
  it('returns true for valid markdown IDs', () => {
    expect(validateMarkdownId('test-markdown-id')).toBe(true);
    expect(validateMarkdownId('test_markdown_id')).toBe(true);
    expect(validateMarkdownId('test123')).toBe(true);
    expect(validateMarkdownId('a')).toBe(true);
    expect(validateMarkdownId('123')).toBe(true);
    expect(validateMarkdownId('a-')).toBe(true);
    expect(validateMarkdownId('-a')).toBe(true);
    expect(validateMarkdownId('a_')).toBe(true);
    expect(validateMarkdownId('_a')).toBe(true);
    expect(validateMarkdownId('test-markdown-id-')).toBe(true);
    expect(validateMarkdownId('test-markdown-id_')).toBe(true);
    expect(validateMarkdownId('----test-markdown-id')).toBe(true);
    expect(validateMarkdownId('____test-markdown-id')).toBe(true);
  });
  it('returns false for invalid markdown IDs', () => {
    expect(validateMarkdownId('')).toBe(false);
    expect(validateMarkdownId(' ')).toBe(false);
    expect(validateMarkdownId('a ')).toBe(false);
    expect(validateMarkdownId('Test-Markdown-Id')).toBe(false);
    expect(validateMarkdownId('Test_Markdown_Id')).toBe(false);
    expect(validateMarkdownId('Test123')).toBe(false);
    expect(validateMarkdownId('test-markdown-id.')).toBe(false);
    expect(validateMarkdownId('test-markdown-id#')).toBe(false);
    expect(validateMarkdownId('test-markdown-id/')).toBe(false);
    expect(validateMarkdownId('test-markdown-id@')).toBe(false);
    expect(validateMarkdownId('test-markdown-id$')).toBe(false);
    expect(validateMarkdownId('test-markdown-id%')).toBe(false);
    expect(validateMarkdownId('test-markdown-id^')).toBe(false);
    expect(validateMarkdownId('test-markdown-id&')).toBe(false);
  });
});
