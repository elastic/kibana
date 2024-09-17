/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Observable } from 'rxjs';
import { Logger } from '@kbn/core/server';
import { Stream, PassThrough } from 'stream';
import { IncomingMessage } from 'http';
import { SerializableRecord } from '@kbn/utility-types';

const delimiter = '\n';

export const createNDJSONStream = <Response>(
  results: Observable<Response>,
  logger: Logger
): Stream => {
  const stream = new PassThrough();
  let activeStreams = 0;
  let observableClosed = false;

  results.subscribe({
    next: (message: Response) => {
      try {
        const rawResponse = (message as SerializableRecord).result?.rawResponse as IncomingMessage;
        if (rawResponse && rawResponse.pipe) {
          activeStreams++;
          let body = '';
          // Collect data from the stream
          rawResponse.on('data', (chunk) => {
            body += chunk.toString(); // Append incoming data chunks
          });

          rawResponse.on('end', () => {
            const result = JSON.parse(body);
            const newMessage = { ...message, result };
            const newLine = JSON.stringify(newMessage);

            stream.write(`${newLine}${delimiter}`);

            activeStreams--; // Decrement counter when the stream finishes

            // Only end the stream when there are no more active streams
            if (activeStreams === 0 && observableClosed) {
              stream.end();
            }
          });
        } else {
          const line = JSON.stringify(message);
          stream.write(`${line}${delimiter}`);
        }
      } catch (error) {
        logger.error('Could not serialize or stream a message.');
        logger.error(error);
      }
    },
    error: (error) => {
      stream.end();
      logger.error(error);
    },
    complete: () => {
      // Only end the stream if there are no active streams
      if (activeStreams === 0) {
        stream.end();
      } else {
        observableClosed = true; // Mark the observable as closed, so the stream can end after active streams finish
      }
    },
  });

  return stream;
};
