/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { resolve } from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { Readable, Writable } from 'stream';
import { Client } from 'elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';
import { createListStream, createPromiseFromStreams } from '@kbn/utils';

import {
  createStats,
  createGenerateIndexRecordsStream,
  createFormatArchiveStreams,
  createGenerateDocRecordsStream,
  Progress,
} from '../lib';

export async function saveAction({
  name,
  indices,
  client,
  dataDir,
  log,
  raw,
  query,
}: {
  name: string;
  indices: string | string[];
  client: Client;
  dataDir: string;
  log: ToolingLog;
  raw: boolean;
  query?: Record<string, any>;
}) {
  const outputDir = resolve(dataDir, name);
  const stats = createStats(name, log);

  log.info('[%s] Creating archive of %j', name, indices);

  mkdirSync(outputDir, { recursive: true });

  const progress = new Progress();
  progress.activate(log);

  await Promise.all([
    // export and save the matching indices to mappings.json
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateIndexRecordsStream(client, stats),
      ...createFormatArchiveStreams(),
      createWriteStream(resolve(outputDir, 'mappings.json')),
    ] as [Readable, ...Writable[]]),

    // export all documents from matching indexes into data.json.gz
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateDocRecordsStream({ client, stats, progress, query }),
      ...createFormatArchiveStreams({ gzip: !raw }),
      createWriteStream(resolve(outputDir, `data.json${raw ? '' : '.gz'}`)),
    ] as [Readable, ...Writable[]]),
  ]);

  progress.deactivate();
  stats.forEachIndex((index, { docs }) => {
    log.info('[%s] Archived %d docs from %j', name, docs.archived, index);
  });

  return stats.toJSON();
}
