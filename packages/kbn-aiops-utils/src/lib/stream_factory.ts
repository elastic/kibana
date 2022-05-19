/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Stream } from 'stream';
import zlib from 'zlib';

import type { Logger } from '@kbn/logging';

// TODO: Replace these with kbn packaged versions once we have those available to us
// These originally came from this location below before moving them to this hacked "any" types:
// import type { Headers } from '@kbn/core/server';
type Headers = Record<string, unknown>;

import { acceptCompression } from './accept_compression';

// We need this otherwise Kibana server will crash with a 'ERR_METHOD_NOT_IMPLEMENTED' error.
class ResponseStream extends Stream.PassThrough {
  flush() {}
  _read() {}
}

const DELIMITER = '\n';

/**
 * Sets up a response stream with support for gzip compression depending on provided
 * request headers.
 *
 * @param logger - Kibana provided logger.
 * @param headers - Request headers.
 * @returns An object with stream attributes and methods.
 */
export function streamFactory<T = unknown>(logger: Logger, headers: Headers, ndjson = true) {
  const isCompressed = acceptCompression(headers);

  const stream = isCompressed ? zlib.createGzip() : new ResponseStream();

  function push(d: T) {
    try {
      const line = ndjson ? `${JSON.stringify(d)}${DELIMITER}` : d;
      stream.write(line);

      // Calling .flush() on a compression stream will
      // make zlib return as much output as currently possible.
      if (isCompressed) {
        stream.flush();
      }
    } catch (error) {
      logger.error('Could not serialize or stream a message.');
      logger.error(error);
    }
  }

  function end() {
    stream.end();
  }

  const responseWithHeaders = {
    body: stream,
    ...(isCompressed
      ? {
          headers: {
            'content-encoding': 'gzip',
          },
        }
      : {}),
  };

  return { DELIMITER, end, push, responseWithHeaders, stream };
}
