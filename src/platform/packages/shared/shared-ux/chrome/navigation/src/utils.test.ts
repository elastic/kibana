/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isActiveFromUrl } from './utils';

describe('isActiveFromUrl()', () => {
  test('returns true if the nodePath is active', () => {
    const nodePath = 'path';
    const activeNodes = [[{ id: 'path', title: '', path: 'path' }]];
    expect(isActiveFromUrl(nodePath, activeNodes)).toBe(true);
  });

  test('returns true if the nodePath is active anywhere in the full path', () => {
    const activeNodes = [
      [
        { id: 'path', title: '', path: 'parent' },
        { id: 'child', title: '', path: 'child' },
      ],
    ];
    expect(isActiveFromUrl('parent', activeNodes)).toBe(true); // both parent
    expect(isActiveFromUrl('child', activeNodes)).toBe(true); // and child are active
  });

  test('returns true only if the nodePath is highest match', () => {
    const activeNodes = [
      [
        { id: 'path', title: '', path: 'parent' },
        { id: 'child', title: '', path: 'child' },
      ],
    ];
    expect(isActiveFromUrl('parent', activeNodes, true)).toBe(false); // not parent
    expect(isActiveFromUrl('child', activeNodes, true)).toBe(true); // and child are active
  });
});
