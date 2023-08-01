/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
type OneReadableRestWritable = [Readable, ...Writable[]];
const pluckLast = (xs: OneReadableRestWritable) => xs[(xs.length = 1)];
const isSize1 = (xs: OneReadableRestWritable): boolean => xs.length === 1;
const lastNotReadable = (last: Readable | Writable) => !isReadable(last);
export async function createPromiseFromStreams<T>(streams: [Readable, ...Writable[]]): Promise<T> {
  let finalChunk: any;
  const last = pluckLast(streams);
  // For a nicer error than what stream.pipeline throws
  if (lastNotReadable(last) && isSize1(streams))
    throw new Error('A minimum of 2 streams is required when a non-readable stream is given');

  // We are pushing a writable stream to capture the last chunk
  if (isReadable(last)) {
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
/**
 * Reads all the text in a readable stream and returns it as a string,
 * via a Promise.
 * @param {stream.Readable} readable
 */
export function readableToString(readable) {
  return new Promise((resolve, reject) => {
    let data = '';
    readable.on('data', function (chunk) {
      // console.log(`\nλjs chunk: \n\t${chunk}`);
      data += chunk;
    });
    readable.on('end', function () {
      resolve(data);
    });
    readable.on('error', function (err) {
      reject(err);
    });
  });
}
