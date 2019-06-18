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

import {
  createConcatStream,
  createListStream,
  createPromiseFromStreams,
} from '../../../../legacy/utils/streams';
import { createLimitStream } from './create_limit_stream';

describe('createLimitStream()', () => {
  test('limit of 5 allows 5 items through', async () => {
    await createPromiseFromStreams([createListStream([1, 2, 3, 4, 5]), createLimitStream(5)]);
  });

  test('limit of 5 errors out when 6 items are through', async () => {
    await expect(
      createPromiseFromStreams([createListStream([1, 2, 3, 4, 5, 6]), createLimitStream(5)])
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Can't import more than 5 objects"`);
  });

  test('send the values on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createLimitStream(3),
      createConcatStream([]),
    ]);

    expect(result).toMatchInlineSnapshot(`
Array [
  1,
  2,
  3,
]
`);
  });
});
