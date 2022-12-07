/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { each, eachSeries } from 'async';
import { Duplex, PassThrough, Transform } from 'stream';
import { loggerProxy } from '../../cli/utils/logger_proxy';

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
      stream.on('end', () => {
        loggerProxy.debug('Stream ended');
        cb();
      });
    },
    () => {
      pt.end();
    }
  );
  return pt;
}

export function fork(...streams: Transform[]): Transform {
  const proxy = new Transform({
    objectMode: true,
    read() {
      this.emit('drain');
    },
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
        (err) => {
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
        proxy.once('drain', resumeAllStreams);
      }
    })
  );

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

export function createFilterTransform(filter: (chunk: any) => boolean): Transform {
  const transform = new Transform({
    objectMode: true,
    read() {
      this.emit('drain');
    },
    write(event, encoding, callback) {
      if (filter(event)) {
        const shouldWriteNext = this.push(event);
        if (!shouldWriteNext) {
          loggerProxy.debug('waiting on drain');
          this.once('drain', callback);
          return;
        }
      }
      callback();
    },
  });

  return transform;
}
