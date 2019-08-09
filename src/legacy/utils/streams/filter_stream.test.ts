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
  createFilterStream,
  createListStream,
  createPromiseFromStreams,
} from './';

describe('createFilterStream()', () => {
  test('calls the function with each item in the source stream', async () => {
    const filter = jest.fn().mockReturnValue(true);

    await createPromiseFromStreams([createListStream(['a', 'b', 'c']), createFilterStream(filter)]);

    expect(filter).toMatchInlineSnapshot(`
[MockFunction] {
  "calls": Array [
    Array [
      "a",
    ],
    Array [
      "b",
    ],
    Array [
      "c",
    ],
  ],
  "results": Array [
    Object {
      "type": "return",
      "value": true,
    },
    Object {
      "type": "return",
      "value": true,
    },
    Object {
      "type": "return",
      "value": true,
    },
  ],
}
`);
  });

  test('send the filtered values on the output stream', async () => {
    const result = await createPromiseFromStreams([
      createListStream([1, 2, 3]),
      createFilterStream<number>(n => n % 2 === 0),
      createConcatStream([]),
    ]);

    expect(result).toMatchInlineSnapshot(`
Array [
  2,
]
`);
  });
});
