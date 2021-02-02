/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { createReadStream } from 'fs';
import { Readable, Writable } from 'stream';
import { Client } from 'elasticsearch';
import { ToolingLog, KbnClient } from '@kbn/dev-utils';
import { createPromiseFromStreams } from '@kbn/utils';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createFilterRecordsStream,
  createDeleteIndexStream,
} from '../lib';

export async function unloadAction({
  name,
  client,
  dataDir,
  log,
  kbnClient,
}: {
  name: string;
  client: Client;
  dataDir: string;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const inputDir = resolve(dataDir, name);
  const stats = createStats(name, log);
  const kibanaPluginIds = await kbnClient.plugins.getEnabledIds();

  const files = prioritizeMappings(await readDirectory(inputDir));
  for (const filename of files) {
    log.info('[%s] Unloading indices from %j', name, filename);

    await createPromiseFromStreams([
      createReadStream(resolve(inputDir, filename)) as Readable,
      ...createParseArchiveStreams({ gzip: isGzip(filename) }),
      createFilterRecordsStream('index'),
      createDeleteIndexStream(client, stats, log, kibanaPluginIds),
    ] as [Readable, ...Writable[]]);
  }

  return stats.toJSON();
}
