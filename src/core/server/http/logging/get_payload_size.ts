/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { ReadStream } from 'fs';
import { isBoom } from '@hapi/boom';
import type { Request } from '@hapi/hapi';

/**
 * Attempts to determine the size (in bytes) of a Hapi response
 * body based on the payload type. Falls back to `undefined`
 * if the size cannot be determined from the response object.
 *
 * @param response Hapi response object or Boom error
 *
 * @internal
 */
export function getResponsePayloadBytes(response: Request['response']): number | undefined {
  const isReadStream = (obj: any): obj is ReadStream => {
    return !isBoom(response) && response.variety === 'stream' && response.source === obj;
  };

  const isBuffer = (obj: any): obj is Buffer => {
    return !isBoom(response) && response.variety === 'buffer' && response.source === obj;
  };

  try {
    if (isBoom(response)) {
      return JSON.stringify(response.output.payload).length;
    } else if (isBuffer(response.source)) {
      return response.source.toString().length;
    } else if (isReadStream(response.source)) {
      return response.source.bytesRead;
    } else if (response.variety === 'plain') {
      return typeof response.source === 'string'
        ? response.source.length
        : JSON.stringify(response.source).length;
    } else if (response.headers['content-length']) {
      const contentLength = response.headers['content-length'];
      const val = parseInt(
        // hapi response headers can be `string | string[]`, so we need to handle both cases
        Array.isArray(contentLength) ? String(contentLength) : contentLength,
        10
      );
      return !isNaN(val) ? val : undefined;
    }
  } catch (e) {
    // We intentionally swallow any errors as this information is
    // only a nicety for logging purposes, and should not cause the
    // server to crash if it cannot be determined.
  }

  return undefined;
}
