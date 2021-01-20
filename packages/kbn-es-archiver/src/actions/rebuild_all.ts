/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve, dirname, relative } from 'path';
import { stat, Stats, rename, createReadStream, createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';
import { fromNode } from 'bluebird';
import { ToolingLog } from '@kbn/dev-utils';
import { createPromiseFromStreams } from '@kbn/utils';
import {
  prioritizeMappings,
  readDirectory,
  isGzip,
  createParseArchiveStreams,
  createFormatArchiveStreams,
} from '../lib';

async function isDirectory(path: string): Promise<boolean> {
  const stats: Stats = await fromNode((cb) => stat(path, cb));
  return stats.isDirectory();
}

export async function rebuildAllAction({
  dataDir,
  log,
  rootDir = dataDir,
}: {
  dataDir: string;
  log: ToolingLog;
  rootDir?: string;
}) {
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
      createReadStream(childPath) as Readable,
      ...createParseArchiveStreams({ gzip }),
      ...createFormatArchiveStreams({ gzip }),
      createWriteStream(tempFile),
    ] as [Readable, ...Writable[]]);

    await fromNode((cb) => rename(tempFile, childPath, cb));
    log.info(`${archiveName} Rebuilt ${childName}`);
  }
}
