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

import { resolve, dirname, relative } from 'path';

import { stat, rename, createReadStream, createWriteStream } from 'fs';

import { fromNode } from 'bluebird';

import { createPromiseFromStreams } from '../../legacy/utils';

import {
  prioritizeMappings,
  readDirectory,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from '../lib';

async function isDirectory(path) {
  const stats = await fromNode(cb => stat(path, cb));
  return stats.isDirectory();
}

export async function rebuildAllAction({ dataDir, log, rootDir = dataDir }) {
  const childNames = prioritizeMappings(await readDirectory(dataDir));
  for (const childName of childNames) {
    const childPath = resolve(dataDir, childName);

    if (await isDirectory(childPath)) {
      await rebuildAllAction({
        dataDir: childPath,
        log,
        rootDir,
      });
      continue;
    }

    const archiveName = dirname(relative(rootDir, childPath));
    log.info(`${archiveName} Rebuilding ${childName}`);
    const gzip = isGzip(childPath);
    const tempFile = childPath + (gzip ? '.rebuilding.gz' : '.rebuilding');

    await createPromiseFromStreams([
      createReadStream(childPath),
      ...createParseArchiveStreams({ gzip }),
      ...createFormatArchiveStreams({ gzip }),
      createWriteStream(tempFile),
    ]);

    await fromNode(cb => rename(tempFile, childPath, cb));
    log.info(`${archiveName} Rebuilt ${childName}`);
  }
}
