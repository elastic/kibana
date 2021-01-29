/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { ReadStream } from 'fs';
import type { ResponseObject } from '@hapi/hapi';

const isBuffer = (obj: unknown): obj is Buffer => Buffer.isBuffer(obj);
const isObject = (obj: unknown): obj is Record<string, any> =>
  typeof obj === 'object' && obj !== null;
const isReadStream = (obj: unknown): obj is ReadStream =>
  typeof obj === 'object' && obj !== null && 'bytesRead' in obj;
const isString = (obj: unknown): obj is string => typeof obj === 'string';

function getContentLength(headers: Record<string, any>): string | string[] | void {
  for (const h of Object.keys(headers)) {
    if (h.toLowerCase() === 'content-length') {
      return headers[h];
    }
  }
}

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
  payload: ResponseObject['source'],
  headers: Record<string, any> = {}
): number | undefined {
  const contentLength = getContentLength(headers);

  if (contentLength) {
    const val = parseInt(
      // hapi response headers can be `string | string[]`, so we need to handle both cases
      Array.isArray(contentLength) ? String(contentLength) : contentLength,
      10
    );
    return !isNaN(val) ? val : undefined;
  }
  if (isBuffer(payload)) {
    return payload.byteLength;
  }
  if (isReadStream(payload)) {
    return payload.bytesRead;
  }
  if (isString(payload)) {
    return Buffer.byteLength(payload);
  }
  if (isObject(payload)) {
    return Buffer.byteLength(JSON.stringify(payload));
  }

  return undefined;
}
