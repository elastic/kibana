/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { ReadStream } from 'fs';
import type { ResponseObject } from '@hapi/hapi';

/**
 * Attempts to determine the size (in bytes) of a hapi/good
 * responsePayload based on the payload type. Falls back to
 * `undefined` if the size cannot be determined.
 *
 * This is similar to the implementation in `core/server/http/logging`,
 * however it uses more duck typing as we do not have access to the
 * entire hapi request object like we do in the HttpServer.
 *
 * @param headers responseHeaders from hapi/good event
 * @param payload responsePayload from hapi/good event
 *
 * @internal
 */
export function getResponsePayloadBytes(
  headers: Record<string, any>,
  payload: ResponseObject['source']
): number | undefined {
  const isBuffer = (obj: any): obj is Buffer => Buffer.isBuffer(obj);
  const isObject = (obj: any): obj is Record<string, any> =>
    obj !== null && typeof obj === 'object';
  const isReadStream = (obj: any): obj is ReadStream =>
    obj && typeof obj === 'object' && 'bytesRead' in obj;
  const isString = (obj: any): obj is string => typeof obj === 'string';

  try {
    if (isBuffer(payload)) {
      return payload.toString().length;
    } else if (isReadStream(payload)) {
      return payload.bytesRead;
    } else if (isString(payload)) {
      return payload.length;
    } else if (isObject(payload)) {
      return JSON.stringify(payload).length;
    } else if (headers['content-length']) {
      const contentLength = headers['content-length'];
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
