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
export function createReduceStream(reducer, initial) {
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
