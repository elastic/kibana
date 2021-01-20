/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { relativeToAbsolute } from './relative_to_absolute';

describe('relativeToAbsolute', () => {
  it('converts a relative path to an absolute url', () => {
    const origin = window.location.origin;
    expect(relativeToAbsolute('path')).toEqual(`${origin}/path`);
    expect(relativeToAbsolute('/path#hash')).toEqual(`${origin}/path#hash`);
    expect(relativeToAbsolute('/path?query=foo')).toEqual(`${origin}/path?query=foo`);
  });
});
