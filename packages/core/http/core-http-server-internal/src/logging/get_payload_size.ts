/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isPlainObject } from 'lodash';
import { ReadStream } from 'fs';
import { Zlib } from 'zlib';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';

type Response = Request['response'];

const isBuffer = (src: unknown, variety: string): src is Buffer =>
  variety === 'buffer' && Buffer.isBuffer(src);
const isFsReadStream = (src: unknown, variety: string): src is ReadStream => {
  return variety === 'stream' && src instanceof ReadStream;
};
const isZlibStream = (src: unknown, variety: string): src is Zlib => {
  return variety === 'stream' && typeof src === 'object' && src !== null && 'bytesWritten' in src;
};
const isString = (src: unknown, variety: string): src is string =>
  variety === 'plain' && typeof src === 'string';

/**
 * Attempts to determine the size (in bytes) of a Hapi response
 * body based on the payload type. Falls back to `undefined`
 * if the size cannot be determined from the response object.
 *
 * @param response Hapi response object or Boom error
 *
 * @internal
 */
export function getResponsePayloadBytes(response: Response, log: Logger): number | undefined {
  try {
    const headers = isBoom(response)
      ? (response.output.headers as Record<string, string | string[]>)
      : response.headers;

    const contentLength = headers && headers['content-length'];
    if (contentLength) {
      const val = parseInt(
        // hapi response headers can be `string | string[]`, so we need to handle both cases
        Array.isArray(contentLength) ? String(contentLength) : contentLength,
        10
      );
      return !isNaN(val) ? val : undefined;
    }

    if (isBoom(response)) {
      return Buffer.byteLength(JSON.stringify(response.output.payload));
    }

    if (isBuffer(response.source, response.variety)) {
      return response.source.byteLength;
    }

    if (isFsReadStream(response.source, response.variety)) {
      return response.source.bytesRead;
    }

    if (isZlibStream(response.source, response.variety)) {
      return response.source.bytesWritten;
    }

    if (isString(response.source, response.variety)) {
      return Buffer.byteLength(response.source);
    }

    if (
      response.variety === 'plain' &&
      (isPlainObject(response.source) || Array.isArray(response.source))
    ) {
      return Buffer.byteLength(JSON.stringify(response.source));
    }
  } catch (e) {
    // We intentionally swallow any errors as this information is
    // only a nicety for logging purposes, and should not cause the
    // server to crash if it cannot be determined.
    log.warn(`Failed to calculate response payload bytes: ${e.message}`);
  }

  return undefined;
}
