import { resolve } from 'path';
import { createReadStream } from 'fs';

import {
  createPromiseFromStreams
} from '../../utils';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createCreateIndexStream,
  createIndexDocRecordsStream,
} from '../lib';

export async function loadAction({ name, skipExisting, client, dataDir, log }) {
  const inputDir = resolve(dataDir, name);
  const stats = createStats(name, log);

  const files = prioritizeMappings(await readDirectory(inputDir));
  for (const filename of files) {
    log.info('[%s] Loading %j', name, filename);

    await createPromiseFromStreams([
      createReadStream(resolve(inputDir, filename)),
      ...createParseArchiveStreams({ gzip: isGzip(filename) }),
      createCreateIndexStream({ client, stats, skipExisting }),
      createIndexDocRecordsStream(client, stats),
    ]);
  }

  const indicesToRefresh = [];
  stats.forEachIndex((index, { docs }) => {
    log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
    indicesToRefresh.push(index);
  });

  await client.indices.refresh({
    index: indicesToRefresh
  });

  return stats.toJSON();
}
