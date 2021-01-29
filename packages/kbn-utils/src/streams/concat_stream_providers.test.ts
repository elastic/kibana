/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Readable } from 'stream';

import { concatStreamProviders } from './concat_stream_providers';
import { createListStream } from './list_stream';
import { createConcatStream } from './concat_stream';
import { createPromiseFromStreams } from './promise_from_streams';

describe('concatStreamProviders() helper', () => {
  test('writes the data from an array of stream providers into a destination stream in order', async () => {
    const results = await createPromiseFromStreams([
      concatStreamProviders([
        () => createListStream(['foo', 'bar']),
        () => createListStream(['baz']),
        () => createListStream(['bug']),
      ]),
      createConcatStream(''),
    ]);

    expect(results).toBe('foobarbazbug');
  });

  test('emits the errors from a sub-stream to the destination', async () => {
    const dest = concatStreamProviders([
      () => createListStream(['foo', 'bar']),
      () =>
        new Readable({
          read() {
            this.destroy(new Error('foo'));
          },
        }),
    ]);

    const errorListener = jest.fn();
    dest.on('error', errorListener);

    await expect(createPromiseFromStreams([dest])).rejects.toThrowErrorMatchingInlineSnapshot(
      `"foo"`
    );
    expect(errorListener.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    [Error: foo],
  ],
]
`);
  });
});
