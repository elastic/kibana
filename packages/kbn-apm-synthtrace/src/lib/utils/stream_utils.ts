/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { each, eachSeries } from 'async';
import { PassThrough, Transform } from 'stream';

export function series(...streams: Transform[]) {
  const pt = new PassThrough({ objectMode: true });
  eachSeries(
    streams,
    (stream, cb) => {
      stream.pipe(pt, { end: false });
      stream.on('end', cb);
    },
    () => {
      pt.end();
    }
  );
  return pt;
}

export function parallel(...streams: NodeJS.ReadableStream[]) {
  const pt = new PassThrough({ objectMode: true });
  streams.forEach((stream) => {
    stream.pipe(pt, { end: false });
  });

  each(
    streams,
    (stream, cb) => {
      stream.on('end', cb);
    },
    () => {
      pt.end();
    }
  );
  return pt;
}

export function pipeline(...streams: [NodeJS.ReadableStream, ...Transform[]]): Transform {
  const [first, ...tail] = streams;

  let stream: NodeJS.ReadableStream = first;

  for (const writable of tail) {
    stream = stream.pipe(writable);
  }

  return stream as Transform;
}

export function fork(...streams: Transform[]): Transform {
  const proxy = new Transform({
    objectMode: true,
    final: (callback) => {
      each(
        streams,
        (stream, cb) => {
          stream.end(cb);
        },
        callback
      );
    },
    write: (chunk, encoding, callback) => {
      each(
        streams,
        (stream, cb) => {
          stream.write(chunk, cb);
        },
        callback
      );
    },
  });

  streams.forEach((stream) => stream.on('data', (chunk) => proxy.push(chunk)));

  each(
    streams,
    (stream, cb) =>
      stream.on('end', () => {
        cb();
      }),
    (err) => {
      proxy.end();
    }
  );

  return proxy;
}
