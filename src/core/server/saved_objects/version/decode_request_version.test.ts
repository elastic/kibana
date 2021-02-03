/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

jest.mock('./decode_version', () => ({
  decodeVersion: jest.fn().mockReturnValue({ _seq_no: 1, _primary_term: 2 }),
}));

import { decodeRequestVersion } from './decode_request_version';
import { decodeVersion } from './decode_version';

it('renames decodeVersion() return value to use if_seq_no and if_primary_term', () => {
  expect(decodeRequestVersion('foobar')).toMatchInlineSnapshot(`
Object {
  "if_primary_term": 2,
  "if_seq_no": 1,
}
`);
  expect(decodeVersion).toHaveBeenCalledWith('foobar');
});
