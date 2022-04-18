/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { promisify } from 'util';
import { Observable } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { Logger } from '@kbn/core/server';
import { Stream, PassThrough } from 'stream';
import { constants, deflate } from 'zlib';

const delimiter = '\n';
const pDeflate = promisify(deflate);

async function zipMessageToStream(output: PassThrough, message: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const gzipped = await pDeflate(message, {
        flush: constants.Z_SYNC_FLUSH,
      });
      output.write(gzipped.toString('base64'));
      output.write(delimiter);
      resolve(undefined);
    } catch (err) {
      reject(err);
    }
  });
}

export const createCompressedStream = <Response>(
  results: Observable<Response>,
  logger: Logger
): Stream => {
  const output = new PassThrough();

  const sub = results
    .pipe(
      concatMap((message: Response) => {
        const strMessage = JSON.stringify(message);
        return zipMessageToStream(output, strMessage);
      }),
      catchError((e) => {
        logger.error('Could not serialize or stream a message.');
        logger.error(e);
        throw e;
      }),
      finalize(() => {
        output.end();
        sub.unsubscribe();
      })
    )
    .subscribe();

  return output;
};
