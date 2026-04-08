/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sanitizeText } from './sanitize_text';

describe('sanitizeText', () => {
  it('should return clean text unchanged', () => {
    expect(sanitizeText('hello world')).toBe('hello world');
  });

  it('should normalize Windows line endings (\\r\\n) to \\n', () => {
    expect(sanitizeText('line1\r\nline2')).toBe('line1\nline2');
  });

  it('should normalize bare carriage returns (\\r) to \\n', () => {
    expect(sanitizeText('line1\rline2')).toBe('line1\nline2');
  });

  it('should replace non-breaking spaces (U+00A0) with regular spaces', () => {
    expect(sanitizeText('key:\u00A0value')).toBe('key: value');
  });

  it('should replace en spaces (U+2002) with regular spaces', () => {
    expect(sanitizeText('key:\u2002value')).toBe('key: value');
  });

  it('should replace em spaces (U+2003) with regular spaces', () => {
    expect(sanitizeText('key:\u2003value')).toBe('key: value');
  });

  it('should replace thin spaces (U+2009) with regular spaces', () => {
    expect(sanitizeText('key:\u2009value')).toBe('key: value');
  });

  it('should remove zero-width spaces (U+200B)', () => {
    expect(sanitizeText('hel\u200Blo')).toBe('hello');
  });

  it('should remove byte order marks (U+FEFF)', () => {
    expect(sanitizeText('\uFEFFhello')).toBe('hello');
  });

  it('should replace left/right single smart quotes with ASCII single quote', () => {
    expect(sanitizeText('\u2018hello\u2019')).toBe("'hello'");
  });

  it('should replace left/right double smart quotes with ASCII double quote', () => {
    expect(sanitizeText('\u201Chello\u201D')).toBe('"hello"');
  });

  it('should handle multiple replacements in a single input', () => {
    const input = '\uFEFFkey:\u00A0\u2018value\u2019\r\n';
    expect(sanitizeText(input)).toBe("key: 'value'\n");
  });

  it('should return an empty string unchanged', () => {
    expect(sanitizeText('')).toBe('');
  });
});
