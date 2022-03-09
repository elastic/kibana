/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, relative } from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { ToolingLog } from '@kbn/dev-utils';
import { REPO_ROOT } from '@kbn/utils';
import { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import { createPromiseFromStreams, concatStreamProviders } from '@kbn/utils';
import { ES_CLIENT_HEADERS } from '../client_headers';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createCreateIndexStream,
  createIndexDocRecordsStream,
  migrateKibanaIndex,
  Progress,
  createDefaultSpace,
} from '../lib';

// pipe a series of streams into each other so that data and errors
// flow from the first stream to the last. Errors from the last stream
// are not listened for
const pipeline = (...streams: Readable[]) =>
  streams.reduce((source, dest) =>
    source.once('error', (error) => dest.destroy(error)).pipe(dest as any)
  );

export async function loadAction({
  inputDir,
  skipExisting,
  useCreate,
  docsOnly,
  client,
  log,
  kbnClient,
}: {
  inputDir: string;
  skipExisting: boolean;
  useCreate: boolean;
  docsOnly?: boolean;
  client: Client;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const name = relative(REPO_ROOT, inputDir);
  const stats = createStats(name, log);
  const files = prioritizeMappings(await readDirectory(inputDir));
  const kibanaPluginIds = await kbnClient.plugins.getEnabledIds();

  // a single stream that emits records from all archive files, in
  // order, so that createIndexStream can track the state of indexes
  // across archives and properly skip docs from existing indexes
  const recordStream = concatStreamProviders(
    files.map((filename) => () => {
      log.info('[%s] Loading %j', name, filename);

      return pipeline(
        createReadStream(resolve(inputDir, filename)),
        ...createParseArchiveStreams({ gzip: isGzip(filename) })
      );
    }),
    { objectMode: true }
  );

  const progress = new Progress();
  progress.activate(log);

  await createPromiseFromStreams([
    recordStream,
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    createIndexDocRecordsStream(client, stats, progress, useCreate),
  ]);

  progress.deactivate();
  const result = stats.toJSON();

  const indicesWithDocs: string[] = [];
  for (const [index, { docs }] of Object.entries(result)) {
    if (docs && docs.indexed > 0) {
      log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
      indicesWithDocs.push(index);
    }
  }

  await client.indices.refresh(
    {
      index: indicesWithDocs.join(','),
      allow_no_indices: true,
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  // If we affected the Kibana index, we need to ensure it's migrated...
  if (Object.keys(result).some((k) => k.startsWith('.kibana'))) {
    await migrateKibanaIndex(kbnClient);
    log.debug('[%s] Migrated Kibana index after loading Kibana data', name);

    if (kibanaPluginIds.includes('spaces')) {
      await createDefaultSpace({ client, index: '.kibana' });
      log.debug('[%s] Ensured that default space exists in .kibana', name);
    }
  }

  return result;
}
