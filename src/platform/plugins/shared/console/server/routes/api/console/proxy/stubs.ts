/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IncomingMessage } from 'http';
import { Readable } from 'stream';

function createResponseStub(response?: string, { statusCode = 200 }: { statusCode?: number } = {}) {
  const resp: Readable & {
    statusCode?: number;
    headers?: Record<string, unknown>;
  } = new Readable({
    read() {
      if (response) {
        this.push(response);
      }
      this.push(null);
    },
  });

  resp.statusCode = statusCode;
  resp.headers = {
    'content-type': 'text/plain',
    'content-length': String(response ? response.length : 0),
  };

  return resp as IncomingMessage;
}

export function createTransportResponseStub(response?: string, options?: { statusCode?: number }) {
  const body = createResponseStub(response, options);

  return {
    body,
    statusCode: body.statusCode!,
    headers: body.headers!,
  };
}
