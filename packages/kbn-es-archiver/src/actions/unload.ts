/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReadStream } from 'fs';
import { relative, resolve } from 'path';
import { Readable, Writable } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import { ToolingLog } from '@kbn/tooling-log';
import { createPromiseFromStreams } from '@kbn/utils';

import {
  createDeleteIndexStream,
  createFilterRecordsStream,
  createParseArchiveStreams,
  createStats,
  isGzip,
  prioritizeMappings,
  readDirectory,
} from '../lib';

export async function unloadAction({
  inputDir,
  client,
  log,
  kbnClient,
}: {
  inputDir: string;
  client: Client;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const name = relative(REPO_ROOT, inputDir);
  const stats = createStats(name, log);

  const files = prioritizeMappings(await readDirectory(inputDir));
  for (const filename of files) {
    log.info('[%s] Unloading indices from %j', name, filename);

    await createPromiseFromStreams([
      createReadStream(resolve(inputDir, filename)) as Readable,
      ...createParseArchiveStreams({ gzip: isGzip(filename) }),
      createFilterRecordsStream((record) => ['index', 'data_stream', 'doc'].includes(record.type)),
      createDeleteIndexStream(client, stats, log),
    ] as [Readable, ...Writable[]]);
  }

  return stats.toJSON();
}
