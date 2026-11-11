/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_LOCATION_BYTES, sanitize, sanitizeLocation } from './sanitize';

const jsonContentBytes = (value: string): number =>
  Buffer.byteLength(JSON.stringify(value).slice(1, -1), 'utf8');

describe('sanitize', () => {
  it('replaces C0 and C1 control characters and lone surrogates with ?', () => {
    const input = 'a\r\nb\x1bc\x7fd\x85e\x9ff\ud800g\udfffh';
    expect(sanitize(input, { maxBytes: 64, keep: 'start' })).toBe('a??b?c?d?e?f?g?h');
  });

  it('keeps valid surrogate pairs intact', () => {
    expect(sanitize('a🚀b', { maxBytes: 64, keep: 'start' })).toBe('a🚀b');
  });

  it.each([
    ['ASCII characters', 'abcdefghij', 5, 'abcde'],
    ['JSON-escaped quotes and backslashes', '"a\\b"c', 6, '"a\\b'],
    ['3-byte UTF-8 characters', '€€€', 7, '€€'],
    ['4-byte UTF-8 characters (surrogate pairs)', '🚀🚀🚀', 10, '🚀🚀'],
  ])(
    'caps %s in JSON-encoded UTF-8 bytes without splitting a code point (keep: start)',
    (_, input, maxBytes, expected) => {
      const out = sanitize(input, { maxBytes, keep: 'start' });
      expect(out).toBe(expected);
      expect(jsonContentBytes(out)).toBeLessThanOrEqual(maxBytes);
    }
  );

  it.each([
    ['ASCII characters', 'abcdefghij', 7, '…ghij'],
    ['JSON-escaped quotes and backslashes', 'a"b\\c"d', 9, '…\\c"d'],
    ['3-byte UTF-8 characters', '€€€€', 10, '…€€'],
    ['4-byte UTF-8 characters (surrogate pairs)', '🚀🚀🚀', 10, '…🚀'],
  ])(
    'keeps the tail with a leading ellipsis within maxBytes (keep: end, %s)',
    (_, input, maxBytes, expected) => {
      const out = sanitize(input, { maxBytes, keep: 'end' });
      expect(out).toBe(expected);
      expect(jsonContentBytes(out)).toBeLessThanOrEqual(maxBytes);
    }
  );
});

describe('sanitizeLocation', () => {
  const ROOT = '/kibana';

  it('converts a file:// URL under the root into a repo-relative location with a 1-based line', () => {
    expect(sanitizeLocation('file:///kibana/src/core/server.ts', 9, ROOT)).toBe(
      'src/core/server.ts:10'
    );
    expect(sanitizeLocation('file:///kibana/src/core/server.ts', 0, `${ROOT}/`)).toBe(
      'src/core/server.ts:1'
    );
  });

  it('decodes percent-encoded file:// paths so roots and paths with spaces or non-ASCII match', () => {
    expect(
      sanitizeLocation(
        'file:///Users/dev/My%20Projects/kibana/src/a%20b.ts',
        4,
        '/Users/dev/My Projects/kibana'
      )
    ).toBe('src/a b.ts:5');
  });

  it('drops query strings and hash fragments', () => {
    expect(sanitizeLocation('file:///kibana/src/a.ts?foo=1#bar', 2, ROOT)).toBe('src/a.ts:3');
  });

  it('keeps node: specifiers', () => {
    expect(sanitizeLocation('node:internal/process/task_queues', 71, ROOT)).toBe(
      'node:internal/process/task_queues:72'
    );
    expect(sanitizeLocation('node:fs', -1, ROOT)).toBe('node:fs');
  });

  it('reduces paths outside the root to their basename', () => {
    expect(sanitizeLocation('file:///home/user/secret/b.js', 0, ROOT)).toBe('b.js:1');
    expect(sanitizeLocation('/home/user/secret/b.js', 0, ROOT)).toBe('b.js:1');
  });

  it('omits the line number when lineNumber is negative and returns undefined for an empty URL', () => {
    expect(sanitizeLocation('file:///kibana/src/a.ts', -1, ROOT)).toBe('src/a.ts');
    expect(sanitizeLocation('', 0, ROOT)).toBeUndefined();
  });

  it('caps long locations from the end with a leading ellipsis within MAX_LOCATION_BYTES', () => {
    const deep = `file:///kibana/src/${'very_long_segment/'.repeat(10)}leaf_file.ts`;
    const location = sanitizeLocation(deep, 41, ROOT)!;
    expect(location.startsWith('…')).toBe(true);
    expect(location.endsWith('/leaf_file.ts:42')).toBe(true);
    expect(jsonContentBytes(location)).toBeLessThanOrEqual(MAX_LOCATION_BYTES);
  });
});
