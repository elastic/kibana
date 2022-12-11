/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { each, eachSeries } from 'async';
import { Duplex, PassThrough, Transform } from 'stream';

export function parallel(...streams: NodeJS.ReadableStream[]) {
  const pt = new PassThrough({ objectMode: true });
  streams.forEach((stream) => {
    stream.pipe(pt, { end: false });
  });

  each(
    streams,
    (stream, cb) => {
      stream.on('end', () => {
        cb();
      });
    },
    () => {
      pt.end();
    }
  );
  return pt;
}

export function fork(...streams: Transform[]): Duplex {
  const proxy = new Transform({
    objectMode: true,
    read() {
      resumeAllStreams();
    },
    write(chunk, encoding, callback) {
      eachSeries(
        streams,
        (stream, cb) => {
          const shouldWriteNext = stream.write(chunk, cb);
          if (!shouldWriteNext) {
            stream.on('drain', cb);
          }
        },
        () => {
          callback();
        }
      );
    },
  });

  function pauseAllStreams() {
    streams.forEach((stream) => stream.pause());
  }

  function resumeAllStreams() {
    streams.forEach((stream) => stream.resume());
  }

  streams.forEach((stream) =>
    stream.on('data', (chunk) => {
      const shouldWriteNext = proxy.push(chunk);
      if (!shouldWriteNext) {
        pauseAllStreams();
      }
    })
  );

  pauseAllStreams();

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
