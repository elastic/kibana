/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseObjectKey, getObjectKey } from './object_key';

describe('#getObjectKey', () => {
  it('returns the expected key string', () => {
    expect(getObjectKey({ type: 'foo', id: 'bar' })).toEqual('foo:bar');
  });
});

describe('#parseObjectKey', () => {
  it('returns the expected object', () => {
    expect(parseObjectKey('foo:bar')).toEqual({ type: 'foo', id: 'bar' });
  });

  it('throws error when input is malformed', () => {
    expect(() => parseObjectKey('foobar')).toThrowError('Malformed object key');
  });
});
