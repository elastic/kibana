/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asSpaceId, DEFAULT_SPACE_ID } from './space_id';

describe('asSpaceId', () => {
  it.each(['default', 'my-space', 'space_1', 'abc123', 'a'])(
    'accepts valid space id "%s"',
    (id) => {
      expect(asSpaceId(id)).toBe(id);
    }
  );

  it.each(['', 'My Space', 'UPPER', 'has space', 'special!char', '/s/foo', 'a/b'])(
    'throws for invalid space id "%s"',
    (id) => {
      expect(() => asSpaceId(id)).toThrow(/Invalid space id/);
    }
  );

  it('is assignable to string', () => {
    const id: string = asSpaceId('test');
    expect(id).toBe('test');
  });
});

describe('DEFAULT_SPACE_ID', () => {
  it('equals "default"', () => {
    expect(DEFAULT_SPACE_ID).toBe('default');
  });

  it('round-trips through asSpaceId', () => {
    expect(asSpaceId('default')).toBe(DEFAULT_SPACE_ID);
  });
});
