/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
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
