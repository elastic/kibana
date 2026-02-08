/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createWriteStream, createReadStream, statSync, ReadStream, WriteStream } from 'fs';

import { Progress } from '../progress';
import { Logger } from '../../../logger';

function openSourceFile({ sourcePath }: { sourcePath: string }) {
  try {
    const fileInfo = statSync(sourcePath);

    const readStream = createReadStream(sourcePath);

    return { readStream, fileInfo };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error('ENOTFOUND');
    }

    throw err;
  }
}

async function copyFile({
  readStream,
  writeStream,
  progress,
}: {
  readStream: ReadStream;
  writeStream: WriteStream;
  progress: Progress;
}) {
  await new Promise<void>((resolve, reject) => {
    // if either stream errors, fail quickly
    readStream.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we transfer
    readStream.on('data', (chunk: string | Buffer) => {
      progress.progress(typeof chunk === 'string' ? chunk.length : chunk.length);
    });

    // write the download to the file system
    readStream.pipe(writeStream);

    // when the write is done, we are done
    writeStream.on('finish', resolve);
  });
}

/*
// Responsible for managing local file transfers
*/
export async function downloadLocalFile(logger: Logger, sourcePath: string, targetPath: string) {
  try {
    const { readStream, fileInfo } = openSourceFile({ sourcePath });
    const writeStream = createWriteStream(targetPath);

    try {
      const progress = new Progress(logger);
      progress.init(fileInfo.size);

      await copyFile({ readStream, writeStream, progress });

      progress.complete();
    } catch (err) {
      readStream.close();
      writeStream.close();
      throw err;
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
}
