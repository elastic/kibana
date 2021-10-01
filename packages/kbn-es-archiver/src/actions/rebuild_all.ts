/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, relative } from 'path';
import { stat, Stats, rename, createReadStream, createWriteStream } from 'fs';
import { Readable, Writable } from 'stream';
import { fromNode } from 'bluebird';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
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

export async function rebuildAllAction({ dataDir, log }: { dataDir: string; log: ToolingLog }) {
  const childNames = prioritizeMappings(await readDirectory(dataDir));
  for (const childName of childNames) {
    const childPath = resolve(dataDir, childName);

    if (await isDirectory(childPath)) {
      await rebuildAllAction({
        dataDir: childPath,
        log,
      });
      continue;
    }

    const archiveName = relative(REPO_ROOT, childPath);
    log.info('[%s] Rebuilding %j', archiveName, childName);
    const gzip = isGzip(childPath);
    const tempFile = childPath + (gzip ? '.rebuilding.gz' : '.rebuilding');

    await createPromiseFromStreams([
      createReadStream(childPath) as Readable,
      ...createParseArchiveStreams({ gzip }),
      ...createFormatArchiveStreams({ gzip }),
      createWriteStream(tempFile),
    ] as [Readable, ...Writable[]]);

    await fromNode((cb) => rename(tempFile, childPath, cb));
    log.info('[%s] Rebuilt %j', archiveName, childName);
  }
}
