/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { prepareRoutes } from './util';

const internal = 'internal' as const;
const pub = 'public' as const;

describe('prepareRoutes', () => {
  test.each([
    {
      input: [{ path: '/api/foo', options: { access: internal } }],
      output: [{ path: '/api/foo', options: { access: internal } }],
      filters: {},
    },
    {
      input: [
        { path: '/api/foo', options: { access: internal } },
        { path: '/api/bar', options: { access: internal } },
      ],
      output: [{ path: '/api/bar', options: { access: internal } }],
      filters: { pathStartsWith: ['/api/bar'] },
    },
    {
      input: [
        { path: '/api/foo', options: { access: pub } },
        { path: '/api/bar', options: { access: internal } },
      ],
      output: [{ path: '/api/foo', options: { access: pub } }],
      filters: { access: pub },
    },
    {
      input: [
        { path: '/api/foo', options: { access: pub } },
        { path: '/api/bar', options: { access: internal } },
        { path: '/api/baz', options: { access: pub } },
      ],
      output: [{ path: '/api/foo', options: { access: pub } }],
      filters: { pathStartsWith: ['/api/foo'], access: pub },
    },
    {
      input: [
        { path: '/api/foo', options: { access: pub } },
        { path: '/api/bar', options: { access: internal } },
        { path: '/api/baz', options: { access: pub } },
      ],
      output: [{ path: '/api/foo', options: { access: pub } }],
      filters: { excludePathsMatching: ['/api/b'], access: pub },
    },
  ])('returns the expected routes #%#', ({ input, output, filters }) => {
    expect(prepareRoutes(input, filters)).toEqual(output);
  });
});
