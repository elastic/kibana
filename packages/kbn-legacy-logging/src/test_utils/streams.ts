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

import { pipeline, Writable, Readable } from 'stream';

/**
 *  Create a Readable stream that provides the items
 *  from a list as objects to subscribers
 *
 *  @param  {Array<any>} items - the list of items to provide
 *  @return {Readable}
 */
export function createListStream<T = any>(items: T | T[] = []) {
  const queue = Array.isArray(items) ? [...items] : [items];

  return new Readable({
    objectMode: true,
    read(size) {
      queue.splice(0, size).forEach((item) => {
        this.push(item);
      });

      if (!queue.length) {
        this.push(null);
      }
    },
  });
}

/**
 *  Take an array of streams, pipe the output
 *  from each one into the next, listening for
 *  errors from any of the streams, and then resolve
 *  the promise once the final stream has finished
 *  writing/reading.
 *
 *  If the last stream is readable, it's final value
 *  will be provided as the promise value.
 *
 *  Errors emitted from any stream will cause
 *  the promise to be rejected with that error.
 *
 *  @param  {Array<Stream>} streams
 *  @return {Promise<any>}
 */

function isReadable(stream: Readable | Writable): stream is Readable {
  return 'read' in stream && typeof stream.read === 'function';
}

export async function createPromiseFromStreams<T>(streams: [Readable, ...Writable[]]): Promise<T> {
  let finalChunk: any;
  const last = streams[streams.length - 1];
  if (!isReadable(last) && streams.length === 1) {
    // For a nicer error than what stream.pipeline throws
    throw new Error('A minimum of 2 streams is required when a non-readable stream is given');
  }
  if (isReadable(last)) {
    // We are pushing a writable stream to capture the last chunk
    streams.push(
      new Writable({
        // Use object mode even when "last" stream isn't. This allows to
        // capture the last chunk as-is.
        objectMode: true,
        write(chunk, enc, done) {
          finalChunk = chunk;
          done();
        },
      })
    );
  }

  return new Promise((resolve, reject) => {
    // @ts-expect-error 'pipeline' doesn't support variable length of arguments
    pipeline(...streams, (err) => {
      if (err) return reject(err);
      resolve(finalChunk);
    });
  });
}
