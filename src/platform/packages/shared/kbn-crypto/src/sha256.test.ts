/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createSHA256Hash } from './sha256';

describe('createSHA256Hash', () => {
  it('creates a hex-encoded hash by default', () => {
    expect(createSHA256Hash('foo')).toMatchInlineSnapshot(
      `"2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae"`
    );
  });

  it('allows the output encoding to be changed', () => {
    expect(createSHA256Hash('foo', 'base64')).toMatchInlineSnapshot(
      `"LCa0a2j/xo/5m0U8HTBBNBNCLXBkg7+g+YpeiGJm564="`
    );
  });

  it('accepts a buffer as input', () => {
    const data = Buffer.from('foo', 'utf8');
    expect(createSHA256Hash(data)).toEqual(createSHA256Hash('foo'));
  });
});
