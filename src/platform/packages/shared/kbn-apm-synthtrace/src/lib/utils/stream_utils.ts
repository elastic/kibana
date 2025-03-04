/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eachSeries } from 'async';
import { Duplex, Readable, Transform, PassThrough } from 'stream';

/**
 * Pipe one or many streams sequentially into the destination stream. Once all
 * source streams have been exhausted, the destination stream is ended.
 * @param sources A collection of streams to read from
 * @param destination The stream to pipe data to
 */
async function combineStreams(sources: Readable[], destination: PassThrough) {
  for (const stream of sources) {
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
      stream.pipe(destination, { end: false });
    });
  }
  destination.emit('end');
}

export function sequential(...streams: Readable[]) {
  const output = new PassThrough({ objectMode: true });
  combineStreams(streams, output).catch((err) => output.destroy(err));
  return output;
}

export function fork(...streams: Transform[]): Duplex {
  const proxy = new Transform({
    objectMode: true,
    final(callback) {
      eachSeries(
        streams,
        (stream, cb) => {
          stream.end(cb);
        },
        callback
      );
    },
    transform(chunk, encoding, callback) {
      eachSeries(
        streams,
        (stream, cb) => {
          const shouldWriteNext = stream.write(chunk, cb);
          if (!shouldWriteNext) {
            stream.once('drain', cb);
          }
        },
        () => {
          callback();
        }
      );
    },
  });

  streams.forEach((stream) =>
    stream.on('data', (chunk) => {
      proxy.push(chunk);
    })
  );

  return proxy;
}

export function createFilterTransform(filter: (chunk: any) => boolean): Transform {
  const transform = new Transform({
    objectMode: true,
    transform(event, encoding, callback) {
      if (filter(event)) {
        callback(null, event);
      } else {
        callback(null);
      }
    },
  });

  return transform;
}
