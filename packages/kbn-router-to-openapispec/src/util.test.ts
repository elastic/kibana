/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { buildGlobalTags, prepareRoutes } from './util';
import { assignToPaths, extractTags } from './util';

describe('extractTags', () => {
  test.each([
    [[], []],
    [['a', 'b', 'c'], []],
    [
      ['oas-tag:foo', 'b', 'oas-tag:bar'],
      ['foo', 'bar'],
    ],
  ])('given %s returns %s', (input, output) => {
    expect(extractTags(input)).toEqual(output);
  });
});

describe('buildGlobalTags', () => {
  test.each([
    {
      name: 'base case',
      paths: {},
      additionalTags: [],
      output: [],
    },
    {
      name: 'all methods',
      paths: {
        '/foo': {
          get: { tags: ['get'] },
          put: { tags: ['put'] },
          post: { tags: ['post'] },
          patch: { tags: ['patch'] },
          delete: { tags: ['delete'] },
          options: { tags: ['options'] },
          head: { tags: ['head'] },
          trace: { tags: ['trace'] },
        },
      },
      additionalTags: [],
      output: [
        { name: 'delete' },
        { name: 'get' },
        { name: 'head' },
        { name: 'options' },
        { name: 'patch' },
        { name: 'post' },
        { name: 'put' },
        { name: 'trace' },
      ],
    },
    {
      name: 'unknown method',
      paths: {
        '/foo': {
          unknown: { tags: ['not-included'] },
        },
        '/bar': {
          post: { tags: ['bar'] },
        },
      },
      additionalTags: [],
      output: [{ name: 'bar' }],
    },
    {
      name: 'dedup',
      paths: {
        '/foo': {
          get: { tags: ['foo'] },
          patch: { tags: ['foo'] },
        },
        '/bar': {
          get: { tags: ['foo'] },
          post: { tags: ['foo'] },
        },
      },
      additionalTags: [],
      output: [{ name: 'foo' }],
    },
    {
      name: 'dedups with additional tags',
      paths: {
        '/foo': { get: { tags: ['foo'] } },
        '/baz': { patch: { tags: ['foo'] } },
        '/bar': { patch: { tags: ['bar'] } },
      },
      additionalTags: ['foo', 'bar', 'baz'],
      output: [{ name: 'bar' }, { name: 'baz' }, { name: 'foo' }],
    },
  ])('$name', ({ paths, additionalTags, output }) => {
    expect(buildGlobalTags(paths as OpenAPIV3.PathsObject, additionalTags)).toEqual(output);
  });
});

describe('assignToPaths', () => {
  it('should transform path names', () => {
    const paths = {};
    assignToPaths(paths, '/foo', {});
    assignToPaths(paths, '/bar/{id?}', {});
    expect(paths).toEqual({
      '/foo': {},
      '/bar/{id}': {},
    });
  });
});

describe('prepareRoutes', () => {
  const internal = 'internal' as const;
  const pub = 'public' as const;
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
