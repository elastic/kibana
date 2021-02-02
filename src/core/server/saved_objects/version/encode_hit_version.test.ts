/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('./encode_version', () => ({
  encodeVersion: jest.fn().mockReturnValue('foo'),
}));

import { encodeHitVersion } from './encode_hit_version';
import { encodeVersion } from './encode_version';

it('renames decodeVersion() return value to use if_seq_no and if_primary_term', () => {
  expect(encodeHitVersion({ _seq_no: 1, _primary_term: 2 })).toMatchInlineSnapshot(`"foo"`);
  expect(encodeVersion).toHaveBeenCalledWith(1, 2);
});
