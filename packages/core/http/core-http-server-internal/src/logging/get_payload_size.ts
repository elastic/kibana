/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// import { isPlainObject } from 'lodash';
// import { ReadStream } from 'fs';
// import { Zlib } from 'zlib';
import { isBoom } from '@hapi/boom';
import type { FastifyReply } from 'fastify';
import type { Logger } from '@kbn/logging';

// const isBuffer = (src: unknown, variety: string): src is Buffer =>
//   variety === 'buffer' && Buffer.isBuffer(src);
// const isFsReadStream = (src: unknown, variety: string): src is ReadStream => {
//   return variety === 'stream' && src instanceof ReadStream;
// };
// const isZlibStream = (src: unknown, variety: string): src is Zlib => {
//   return variety === 'stream' && typeof src === 'object' && src !== null && 'bytesWritten' in src;
// };
// const isString = (src: unknown, variety: string): src is string =>
//   variety === 'plain' && typeof src === 'string';

/**
 * Attempts to determine the size (in bytes) of a Fastify response
 * body based on the payload type. Falls back to `undefined`
 * if the size cannot be determined from the response object.
 *
 * @param response FastifyReply object or Boom error
 *
 * @internal
 */
export function getResponsePayloadBytes(reply: FastifyReply, log: Logger): number | undefined {
  try {
    const headers = isBoom(reply)
      ? (reply.output.headers as Record<string, string | string[]>)
      : reply.getHeaders();

    const contentLength = headers && headers['content-length'];
    if (contentLength) {
      // FastifyReply headers can be `string | string[] | number`, so we need to handle all cases
      const val =
        typeof contentLength === 'number'
          ? contentLength
          : parseInt(Array.isArray(contentLength) ? String(contentLength) : contentLength, 10);
      return !isNaN(val) ? val : undefined;
    }

    if (isBoom(reply)) {
      return Buffer.byteLength(JSON.stringify(reply.output.payload));
    }

    // TODO: Convert to Fastify
    // if (isBuffer(reply.source, reply.variety)) {
    //   return reply.source.byteLength;
    // }

    // if (isFsReadStream(reply.source, reply.variety)) {
    //   return reply.source.bytesRead;
    // }

    // if (isZlibStream(reply.source, reply.variety)) {
    //   return reply.source.bytesWritten;
    // }

    // if (isString(reply.source, reply.variety)) {
    //   return Buffer.byteLength(reply.source);
    // }

    // if (
    //   reply.variety === 'plain' &&
    //   (isPlainObject(reply.source) || Array.isArray(reply.source))
    // ) {
    //   return Buffer.byteLength(JSON.stringify(reply.source));
    // }
  } catch (e) {
    // We intentionally swallow any errors as this information is
    // only a nicety for logging purposes, and should not cause the
    // server to crash if it cannot be determined.
    log.warn('Failed to calculate response payload bytes.', e);
  }

  return undefined;
}
