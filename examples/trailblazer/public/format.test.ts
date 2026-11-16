/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flattenSource, formatBytes, getFieldValue } from './format';

describe('flattenSource', () => {
  it('flattens nested objects into sorted dotted paths', () => {
    expect(flattenSource({ b: 1, a: { y: 'x', z: null } })).toEqual([
      { path: 'a.y', value: 'x' },
      { path: 'a.z', value: null },
      { path: 'b', value: 1 },
    ]);
  });

  it('gives array elements, including objects in arrays, their parent path', () => {
    expect(flattenSource({ tags: ['a', 'b'], hosts: [{ name: 'h1' }, { name: 'h2' }] })).toEqual([
      { path: 'hosts.name', value: 'h1' },
      { path: 'hosts.name', value: 'h2' },
      { path: 'tags', value: 'a' },
      { path: 'tags', value: 'b' },
    ]);
  });

  it('finds a value by dotted path', () => {
    expect(getFieldValue({ event: { created: '2026-11-06' } }, 'event.created')).toBe('2026-11-06');
    expect(getFieldValue({}, 'missing')).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('scales to the largest whole unit', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(50 * 1024 * 1024)).toBe('50 MB');
  });
});
