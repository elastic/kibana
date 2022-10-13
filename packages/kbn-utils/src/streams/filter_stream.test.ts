/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createConcatStream,
  createFilterStream,
  createListStream,
  createPromiseFromStreams,
} from '.';

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
      createFilterStream<number>((n) => n % 2 === 0),
      createConcatStream([]),
    ]);

    expect(result).toMatchInlineSnapshot(`
      Array [
        2,
      ]
    `);
  });
});
