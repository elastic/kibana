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

import { Stream, PassThrough } from 'stream';
import { StreamingResponseHandler } from '../../common/types';

const delimiter = '\n';

export const createStreamingResponseStream = <Payload, Response>(
  payload: Payload,
  handler: StreamingResponseHandler<Payload, Response>
): Stream => {
  const stream = new PassThrough();
  const results = handler.onRequest(payload);

  results.subscribe({
    next: (message: Response) => {
      try {
        const line = JSON.stringify(message);
        stream.write(`${line}${delimiter}`);
      } catch (error) {
        // eslint-disable-next-line
        console.error('Could not serialize or stream a message.')
        // eslint-disable-next-line
        console.error(error);
      }
    },
    error: error => {
      stream.end();
      // eslint-disable-next-line
      console.error(error);
    },
    complete: () => stream.end(),
  });

  return stream;
};
