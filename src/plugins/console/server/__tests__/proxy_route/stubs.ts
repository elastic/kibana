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
