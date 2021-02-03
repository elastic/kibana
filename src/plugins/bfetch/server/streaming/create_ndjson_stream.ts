/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Observable } from 'rxjs';
import { Logger } from 'src/core/server';
import { Stream, PassThrough } from 'stream';

const delimiter = '\n';

export const createNDJSONStream = <Response>(
  results: Observable<Response>,
  logger: Logger
): Stream => {
  const stream = new PassThrough();

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
    error: (error) => {
      stream.end();
      logger.error(error);
    },
    complete: () => stream.end(),
  });

  return stream;
};
