/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';

/**
 *  Create a transform stream that consumes each chunk it receives
 *  and passes it to the reducer, which will return the new value
 *  for the stream. Once all chunks have been received the reduce
 *  stream provides the result of final call to the reducer to
 *  subscribers.
 *
 *  @param  {Function}
 *  @param  {any} initial Initial value for the stream, if undefined
 *                        then the first chunk provided is used as the
 *                        initial value.
 *  @return {Transform}
 */
export function createReduceStream<T>(
  reducer: (value: any, chunk: T, enc: string) => T,
  initial?: T
) {
  let i = -1;
  let value = initial;

  // if the reducer throws an error then the value is
  // considered invalid and the stream will never provide
  // it to subscribers. We will also stop calling the
  // reducer for any new data that is provided to us
  let failed = false;

  if (typeof reducer !== 'function') {
    throw new TypeError('reducer must be a function');
  }

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(chunk, enc, callback) {
      try {
        if (failed) {
          return callback();
        }

        i += 1;
        if (i === 0 && initial === undefined) {
          value = chunk;
        } else {
          value = await reducer(value, chunk, enc);
        }

        callback();
      } catch (err) {
        failed = true;
        callback(err);
      }
    },

    flush(callback) {
      if (!failed) {
        this.push(value);
      }

      callback();
    },
  });
}
