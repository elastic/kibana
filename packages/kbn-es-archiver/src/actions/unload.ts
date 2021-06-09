/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, relative } from 'path';
import { createReadStream } from 'fs';
import { Readable, Writable } from 'stream';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog, REPO_ROOT } from '@kbn/dev-utils';
import { KbnClient } from '@kbn/test';
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
  inputDir,
  client,
  log,
  kbnClient,
}: {
  inputDir: string;
  client: KibanaClient;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const name = relative(REPO_ROOT, inputDir);
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
