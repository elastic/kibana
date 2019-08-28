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
import { createWriteStream } from 'fs';

import { fromNode } from 'bluebird';
import mkdirp from 'mkdirp';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../legacy/utils';

import {
  createStats,
  createGenerateIndexRecordsStream,
  createFormatArchiveStreams,
  createGenerateDocRecordsStream,
  Progress
} from '../lib';

export async function saveAction({ name, indices, client, dataDir, log, raw }) {
  const outputDir = resolve(dataDir, name);
  const stats = createStats(name, log);

  log.info('[%s] Creating archive of %j', name, indices);

  await fromNode(cb => mkdirp(outputDir, cb));

  const progress = new Progress();
  progress.activate(log);

  await Promise.all([
    // export and save the matching indices to mappings.json
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateIndexRecordsStream(client, stats),
      ...createFormatArchiveStreams(),
      createWriteStream(resolve(outputDir, 'mappings.json')),
    ]),

    // export all documents from matching indexes into data.json.gz
    createPromiseFromStreams([
      createListStream(indices),
      createGenerateDocRecordsStream(client, stats, progress),
      ...createFormatArchiveStreams({ gzip: !raw }),
      createWriteStream(resolve(outputDir, `data.json${raw ? '' : '.gz'}`))
    ])
  ]);

  progress.deactivate();
  stats.forEachIndex((index, { docs }) => {
    log.info('[%s] Archived %d docs from %j', name, docs.archived, index);
  });

  return stats.toJSON();
}
