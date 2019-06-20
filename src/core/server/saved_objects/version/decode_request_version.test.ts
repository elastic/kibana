/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
