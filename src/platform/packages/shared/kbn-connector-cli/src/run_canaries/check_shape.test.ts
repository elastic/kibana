/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkShape } from './check_shape';

describe('checkShape', () => {
  const data = {
    login: 'octocat',
    id: 1,
    site_admin: false,
    plan: { name: 'free' },
    repos: [{ name: 'hello' }],
    bio: null,
  };

  it('returns no mismatches when every expectation is met', () => {
    expect(
      checkShape(data, [
        { path: 'login', type: 'string' },
        { path: 'id', type: 'number' },
        { path: 'site_admin', type: 'boolean' },
        { path: 'plan', type: 'object' },
        { path: 'plan.name', type: 'string' },
        { path: 'repos', type: 'array' },
        { path: 'repos.0.name', type: 'string' },
        { path: 'bio', type: 'null' },
      ])
    ).toEqual([]);
  });

  it('checks the response itself with the $ path', () => {
    expect(checkShape({}, [{ path: '$', type: 'object' }])).toEqual([]);
    expect(checkShape([], [{ path: '$', type: 'object' }])).toEqual([
      '"$" is array (expected object)',
    ]);
    expect(checkShape(undefined, [{ path: '$', type: 'object' }])).toEqual([
      '"$" is other (expected object)',
    ]);
  });

  it('reports a missing path', () => {
    expect(checkShape(data, [{ path: 'plan.tier', type: 'string' }])).toEqual([
      '"plan.tier" is missing (expected string)',
    ]);
  });

  it('reports a missing array index', () => {
    expect(checkShape(data, [{ path: 'repos.1.name', type: 'string' }])).toEqual([
      '"repos.1.name" is missing (expected string)',
    ]);
  });

  it.each([
    'repos.',
    'repos..name',
    'repos. .name',
    'repos.0x0.name',
    'repos.00.name',
    'repos.0e0.name',
  ])('does not read "%s" as an array index', (path) => {
    expect(checkShape(data, [{ path, type: 'string' }])).toEqual([
      `"${path}" is missing (expected string)`,
    ]);
  });

  it('reports a type mismatch, telling arrays and objects apart', () => {
    expect(
      checkShape(data, [
        { path: 'id', type: 'string' },
        { path: 'repos', type: 'object' },
      ])
    ).toEqual(['"id" is number (expected string)', '"repos" is array (expected object)']);
  });

  it('does not resolve inherited properties as if they were response fields', () => {
    expect(
      checkShape(data, [
        { path: 'plan.constructor', type: 'object' },
        { path: 'plan.__proto__', type: 'object' },
        { path: 'login.length', type: 'number' },
      ])
    ).toHaveLength(3);
  });

  it('reports every mismatch, not just the first', () => {
    expect(
      checkShape(undefined, [
        { path: 'a', type: 'string' },
        { path: 'b', type: 'string' },
      ])
    ).toHaveLength(2);
  });
});
