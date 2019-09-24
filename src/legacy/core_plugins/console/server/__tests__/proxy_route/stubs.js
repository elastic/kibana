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

import { Duplex } from 'stream';

let headers;
export function readLastHeaders() {
  return headers;
}

export function createResponseStub(response) {
  return (_, cb) => {
    const stream = new Duplex();
    const httpInfo = {
      statusCode: 200,
      statusMessage: 'OK',
      headers: {
        'content-type': 'text/plain',
        'content-length': String(response ? response.length : 0)
      }
    };

    stream.statusCode = httpInfo.statusCode;
    stream.statusMessage = httpInfo.statusMessage;
    stream.headers = httpInfo.headers;

    stream.on('pipe', (src) => {
      headers = src.headers;
      cb(null, { ...httpInfo, body: response });
    });

    return stream;
  };
}
