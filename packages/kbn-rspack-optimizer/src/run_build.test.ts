/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatSize } from './run_build';

describe('formatSize', () => {
  it('formats bytes below 1024 as B', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(500)).toBe('500 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats bytes at 1024 boundary as KB', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
  });

  it('formats kilobyte values with one decimal', () => {
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(10240)).toBe('10.0 KB');
  });

  it('formats bytes at MB boundary', () => {
    expect(formatSize(1024 * 1024)).toBe('1.00 MB');
  });

  it('formats megabyte values with two decimals', () => {
    expect(formatSize(5.5 * 1024 * 1024)).toBe('5.50 MB');
  });
});
