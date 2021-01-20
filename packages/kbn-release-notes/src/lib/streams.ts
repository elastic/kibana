/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { promisify } from 'util';
import { Readable, pipeline } from 'stream';

/**
 * @types/node still doesn't have this method that was added
 * in 10.17.0 https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
 */
export function streamFromIterable(
  iter: Iterable<string | Buffer> | AsyncIterable<string | Buffer>
): Readable {
  // @ts-ignore
  return Readable.from(iter);
}

export const asyncPipeline = promisify(pipeline);
