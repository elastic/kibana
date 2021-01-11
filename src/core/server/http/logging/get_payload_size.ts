/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
      return JSON.stringify(response.source).length;
    } else if (response.headers['content-length']) {
      const contentLength = response.headers['content-length'];
      return parseInt(Array.isArray(contentLength) ? String(contentLength) : contentLength, 10);
    }
  } catch (e) {
    // We intentionally swallow any errors as this information is
    // only a nicety for logging purposes, and should not cause the
    // server to crash if it cannot be determined.
  }

  return undefined;
}
