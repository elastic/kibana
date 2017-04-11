import { resolve } from 'path';
import { createWriteStream } from 'fs';

import { fromNode } from 'bluebird';
import mkdirp from 'mkdirp';

import {
  createListStream,
  createPromiseFromStreams,
} from '../../utils';

import {
  createStats,
  createGenerateIndexRecordsStream,
  createFormatArchiveStreams,
  createGenerateDocRecordsStream,
} from '../lib';

export async function saveAction({ name, indices, client, dataDir, log }) {
  const outputDir = resolve(dataDir, name);
  const stats = createStats(name, log);

  log.info('[%s] Creating archive of %j', name, indices);

  await fromNode(cb => mkdirp(outputDir, cb));
  const resolvedIndexes = Object.keys(await client.indices.get({
    index: indices,
    feature: ['_settings'],
    filterPath: ['*.settings.index.uuid']
  }));

  await Promise.all([
    // export and save the matching indices to mappings.json
    createPromiseFromStreams([
      createListStream(resolvedIndexes),
      createGenerateIndexRecordsStream(client, stats),
      ...createFormatArchiveStreams(),
      createWriteStream(resolve(outputDir, 'mappings.json')),
    ]),

    // export all documents from matching indexes into data.json.gz
    createPromiseFromStreams([
      createListStream(resolvedIndexes),
      createGenerateDocRecordsStream(client, stats),
      ...createFormatArchiveStreams({ gzip: true }),
      createWriteStream(resolve(outputDir, 'data.json.gz'))
    ])
  ]);

  stats.forEachIndex((index, { docs }) => {
    log.info('[%s] Archived %d docs from %j', name, docs.archived, index);
  });

  return stats.toJSON();
}
