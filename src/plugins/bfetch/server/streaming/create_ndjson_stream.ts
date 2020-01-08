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

import { Logger } from 'src/core/server';
import { Stream, PassThrough } from 'stream';
import { StreamingResponseHandler } from '../../common/types';

const delimiter = '\n';

export const createNDJSONStream = <Payload, Response>(
  payload: Payload,
  handler: StreamingResponseHandler<Payload, Response>,
  logger: Logger
): Stream => {
  const stream = new PassThrough();
  const results = handler.onRequest(payload);

  results.subscribe({
    next: (message: Response) => {
      try {
        const line = JSON.stringify(message);
        stream.write(`${line}${delimiter}`);
      } catch (error) {
        logger.error('Could not serialize or stream a message.');
        logger.error(error);
      }
    },
    error: error => {
      stream.end();
      logger.error(error);
    },
    complete: () => stream.end(),
  });

  return stream;
};
