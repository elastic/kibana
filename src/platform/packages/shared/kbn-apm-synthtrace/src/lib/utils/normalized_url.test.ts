/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeUrl } from './normalize_url';

describe('normalizeUrl', () => {
  it('should remove unnecessary double slashes from the URL', () => {
    const url = 'http://example.com//some//path///to/resource';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com/some/path/to/resource');
  });

  it('should preserve the protocol slashes', () => {
    const url = 'http:///example.com';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com');
  });

  it('should handle URLs with query parameters', () => {
    const url = 'http://example.com//some/path?key=value&key2=value2';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com/some/path?key=value&key2=value2');
  });

  it('should handle URLs with port', () => {
    const url = 'http://example:3000//some/path?key=value&key2=value2';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example:3000/some/path?key=value&key2=value2');
  });

  it('should handle URLs with localhost port and extra path', () => {
    const url = 'http://localhost:3000//some/path//more/path';
    const result = normalizeUrl(url);
    expect(result).toBe('http://localhost:3000/some/path/more/path');
  });

  it('should handle URLs with trailing slashes', () => {
    const url = 'http://example.com/some/path///';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com/some/path/');
  });

  it('should handle URLs without double slashes', () => {
    const url = 'http://example.com/some/path';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com/some/path');
  });

  it('should handle URLs with no path', () => {
    const url = 'http://example.com';
    const result = normalizeUrl(url);
    expect(result).toBe('http://example.com');
  });

  it('should handle empty strings', () => {
    const url = '';
    const result = normalizeUrl(url);
    expect(result).toBe('');
  });

  it('should handle URLs with differnt protocol', () => {
    const url = 'ftp://example.com//some/path';
    const result = normalizeUrl(url);
    expect(result).toBe('ftp://example.com/some/path');
  });
});
