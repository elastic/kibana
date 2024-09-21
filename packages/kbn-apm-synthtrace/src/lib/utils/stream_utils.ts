/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { eachSeries } from 'async';
import MultiStream from 'multistream';
import { Duplex, Readable, Transform } from 'stream';

export function sequential(...streams: Readable[]) {
  return new MultiStream(streams, { objectMode: true });
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
