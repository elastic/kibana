/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { catchError, concatMap, finalize } from 'rxjs/operators';
import { Logger } from 'src/core/server';
import { Stream, PassThrough } from 'stream';
import { createDeflate, constants } from 'zlib';

const delimiter = '\n';

async function zipMessageToStream(output: PassThrough, message: string) {
  return new Promise((resolve, reject) => {
    const gz = createDeflate({
      flush: constants.Z_SYNC_FLUSH,
    });
    gz.on('error', function (err) {
      reject(err);
    });
    gz.on('data', (data) => {
      output.write(data.toString('hex'));
    });
    // gz.pipe(output, { end: false });
    gz.end(Buffer.from(message));

    Stream.finished(gz, {}, () => {
      output.write(delimiter);
      resolve(undefined);
    });
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
