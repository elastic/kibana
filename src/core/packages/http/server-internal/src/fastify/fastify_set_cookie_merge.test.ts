/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mergeSetCookieHeaderValues } from './fastify_set_cookie_merge';

describe('mergeSetCookieHeaderValues', () => {
  it('replaces a cookie when a clearing cookie is written before a new value', () => {
    const existing = ['sid=old; Path=/; HttpOnly'];
    const merged = mergeSetCookieHeaderValues(existing, [
      'sid=; Path=/; HttpOnly; Max-Age=0',
      'sid=new; Path=/; HttpOnly',
    ]);
    expect(merged).toEqual(['sid=new; Path=/; HttpOnly']);
  });

  it('replaces an existing cookie when the same name is set again', () => {
    const merged = mergeSetCookieHeaderValues(['sid=a; Path=/'], ['sid=b; Path=/']);
    expect(merged).toEqual(['sid=b; Path=/']);
  });
});
