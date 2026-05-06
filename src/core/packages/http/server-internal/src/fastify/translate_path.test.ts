/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractHapiWildcardName, translateHapiPathToFastify } from './translate_path';

describe('translateHapiPathToFastify', () => {
  it.each([
    ['/api/foo', '/api/foo'],
    ['/api/foo/{id}', '/api/foo/:id'],
    ['/api/foo/{id?}', '/api/foo/:id?'],
    ['/api/foo/{id}/bar/{name}', '/api/foo/:id/bar/:name'],
    ['/api/foo/{any*}', '/api/foo/*'],
    ['/assets/{any*}', '/assets/*'],
    ['/api/foo/{id}/{any*}', '/api/foo/:id/*'],
  ])('translates %s to %s', (input, expected) => {
    expect(translateHapiPathToFastify(input)).toBe(expected);
  });
});

describe('extractHapiWildcardName', () => {
  it.each([
    ['/api/foo', undefined],
    ['/api/foo/{id}', undefined],
    ['/api/foo/{any*}', 'any'],
    ['/{path*}', 'path'],
    ['/api/foo/{id}/{rest*}', 'rest'],
  ])('returns %s for %s', (input, expected) => {
    expect(extractHapiWildcardName(input)).toBe(expected);
  });
});
