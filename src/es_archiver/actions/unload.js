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
  createFilterRecordsStream,
  createDeleteIndexStream
} from '../lib';

export async function unloadAction({ name, client, dataDir, log }) {
  const inputDir = resolve(dataDir, name);
  const stats = createStats(name, log);

  const files = prioritizeMappings(await readDirectory(inputDir));
  for (const filename of files) {
    log.info('[%s] Unloading indices from %j', name, filename);

    await createPromiseFromStreams([
      createReadStream(resolve(inputDir, filename)),
      ...createParseArchiveStreams({ gzip: isGzip(filename) }),
      createFilterRecordsStream('index'),
      createDeleteIndexStream(client, stats)
    ]);
  }

  return stats.toJSON();
}
