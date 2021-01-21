/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IncomingMessage } from 'http';
import { Readable } from 'stream';

export function createResponseStub(response: any) {
  const resp: any = new Readable({
    read() {
      if (response) {
        this.push(response);
      }
      this.push(null);
    },
  });

  resp.statusCode = 200;
  resp.statusMessage = 'OK';
  resp.headers = {
    'content-type': 'text/plain',
    'content-length': String(response ? response.length : 0),
  };

  return resp as IncomingMessage;
}
