/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve, relative } from 'path';
import { createWriteStream, mkdirSync } from 'fs';
import { Readable, Writable } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createListStream, createPromiseFromStreams } from '@kbn/utils';
import { REPO_ROOT } from '@kbn/repo-info';

import {
  createStats,
  createGenerateIndexRecordsStream,
  createFormatArchiveStreams,
  createGenerateDocRecordsStream,
  Progress,
} from '../lib';

export async function saveAction({
  outputDir,
  indices,
  client,
  log,
  raw,
  keepIndexNames,
  query,
}: {
  outputDir: string;
  indices: string | string[];
  client: Client;
  log: ToolingLog;
  raw: boolean;
  keepIndexNames?: boolean;
  query?: Record<string, any>;
}) {
  const name = relative(REPO_ROOT, outputDir);
  const stats = createStats(name, log);

  log.info('[%s] Creating archive of %j', name, indices);

  mkdirSync(outputDir, { recursive: true });

  const progress = new Progress();
  progress.activate(log);

  await Promise.all([
    // export and save the matching indices to mappings.json
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateIndexRecordsStream({ client, stats, keepIndexNames, log }),
      ...createFormatArchiveStreams(),
      createWriteStream(resolve(outputDir, 'mappings.json')),
    ] as [Readable, ...Writable[]]),

    // export all documents from matching indexes into data.json.gz
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateDocRecordsStream({ client, stats, progress, keepIndexNames, query }),
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
