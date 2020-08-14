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
import { Readable, Writable } from 'stream';
import { Client } from 'elasticsearch';
import { ToolingLog, KbnClient } from '@kbn/dev-utils';

import { createPromiseFromStreams } from '../lib/streams';
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
