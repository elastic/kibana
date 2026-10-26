/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { encodePathParams, replaceParams } from './path_params_replacer';

describe('replaceParams', () => {
  it('replaces multiple path params', () => {
    expect(replaceParams('my/{a}/to/{b}', { a: '1', b: '2' })).toBe('my/1/to/2');
  });
});

describe('encodePathParams', () => {
  it('percent-encodes reserved characters in every value', () => {
    expect(encodePathParams({ id: 'team/alice', q: 'a?b#c' })).toEqual({
      id: 'team%2Falice',
      q: 'a%3Fb%23c',
    });
  });

  it('stringifies numeric values', () => {
    expect(encodePathParams({ page: 2 })).toEqual({ page: '2' });
  });

  it('keeps reserved characters inside one path segment when combined with replaceParams', () => {
    expect(replaceParams('entities/{id}/summary', encodePathParams({ id: 'team/alice' }))).toBe(
      'entities/team%2Falice/summary'
    );
  });
});
