/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReadStream } from 'fs';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';
import { Logger } from '../../logging';

type Response = Request['response'];

const isBuffer = (src: unknown, res: Response): src is Buffer => {
  return !isBoom(res) && res.variety === 'buffer' && res.source === src;
};
const isFsReadStream = (src: unknown, res: Response): src is ReadStream => {
  return !isBoom(res) && res.variety === 'stream' && res.source === src;
};

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

    if (isBuffer(response.source, response)) {
      return response.source.byteLength;
    }

    if (isFsReadStream(response.source, response)) {
      return response.source.bytesRead;
    }

    if (response.variety === 'plain') {
      return typeof response.source === 'string'
        ? Buffer.byteLength(response.source)
        : Buffer.byteLength(JSON.stringify(response.source));
    }
  } catch (e) {
    // We intentionally swallow any errors as this information is
    // only a nicety for logging purposes, and should not cause the
    // server to crash if it cannot be determined.
    log.warn('Failed to calculate response payload bytes.', e);
  }

  return undefined;
}
