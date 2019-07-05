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

import Progress from '../progress';
import { createWriteStream, createReadStream, statSync } from 'fs';

function openSourceFile({ sourcePath }) {
  try {
    const fileInfo = statSync(sourcePath);

    const readStream = createReadStream(sourcePath);

    return { readStream, fileInfo };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('ENOTFOUND');
    }

    throw err;
  }
}

async function copyFile({ readStream, writeStream, progress }) {
  await new Promise((resolve, reject) => {
    // if either stream errors, fail quickly
    readStream.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we transfer
    readStream.on('data', (chunk) => {
      progress.progress(chunk.length);
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
export default async function copyLocalFile(logger, sourcePath, targetPath) {
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
