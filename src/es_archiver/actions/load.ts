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

import { resolve } from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { ToolingLog, KbnClient } from '@kbn/dev-utils';
import { Client } from 'elasticsearch';

import { createPromiseFromStreams, concatStreamProviders } from '../../legacy/utils';

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
    source.once('error', (error) => dest.emit('error', error)).pipe(dest as any)
  );

export async function loadAction({
  name,
  skipExisting,
  useCreate,
  client,
  dataDir,
  log,
  kbnClient,
}: {
  name: string;
  skipExisting: boolean;
  useCreate: boolean;
  client: Client;
  dataDir: string;
  log: ToolingLog;
  kbnClient: KbnClient;
}) {
  const inputDir = resolve(dataDir, name);
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
    createCreateIndexStream({ client, stats, skipExisting, log }),
    createIndexDocRecordsStream(client, stats, progress, useCreate),
  ]);

  progress.deactivate();
  const result = stats.toJSON();

  for (const [index, { docs }] of Object.entries(result)) {
    if (docs && docs.indexed > 0) {
      log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
    }
  }

  await client.indices.refresh({
    index: '_all',
    allowNoIndices: true,
  });

  // If we affected the Kibana index, we need to ensure it's migrated...
  if (Object.keys(result).some((k) => k.startsWith('.kibana'))) {
    await migrateKibanaIndex({ client, kbnClient });

    if (kibanaPluginIds.includes('spaces')) {
      await createDefaultSpace({ client, index: '.kibana' });
    }
  }

  return result;
}
