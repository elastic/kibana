/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

import { pipeline, Writable, Readable } from 'stream';

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
