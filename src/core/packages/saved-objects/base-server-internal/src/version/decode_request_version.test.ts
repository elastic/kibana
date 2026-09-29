/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

vi.mock('./decode_version', () => {
  const mocked = {
    decodeVersion: vi.fn().mockReturnValue({ _seq_no: 1, _primary_term: 2 }),
  };
  return { ...mocked, default: mocked };
});

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
