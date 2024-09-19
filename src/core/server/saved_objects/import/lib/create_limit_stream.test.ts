/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createConcatStream, createListStream, createPromiseFromStreams } from '@kbn/utils';
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
