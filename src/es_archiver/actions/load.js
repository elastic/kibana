import { resolve } from 'path';
import { createReadStream } from 'fs';

import {
  createPromiseFromStreams,
  concatStreamProviders,
} from '../../utils';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createCreateIndexStream,
  createIndexDocRecordsStream,
  migrateKibanaIndex,
} from '../lib';

// pipe a series of streams into each other so that data and errors
// flow from the first stream to the last. Errors from the last stream
// are not listened for
const pipeline = (...streams) => streams
  .reduce((source, dest) => (
    source
      .once('error', (error) => dest.emit('error', error))
      .pipe(dest)
  ));

export async function loadAction({ name, skipExisting, client, dataDir, log }) {
  const inputDir = resolve(dataDir, name);
  const stats = createStats(name, log);
  const files = prioritizeMappings(await readDirectory(inputDir));

  // a single stream that emits records from all archive files, in
  // order, so that createIndexStream can track the state of indexes
  // across archives and properly skip docs from existing indexes
  const recordStream = concatStreamProviders(
    files.map(filename => () => {
      log.info('[%s] Loading %j', name, filename);

      return pipeline(
        createReadStream(resolve(inputDir, filename)),
        ...createParseArchiveStreams({ gzip: isGzip(filename) })
      );
    }),
    { objectMode: true }
  );

  await createPromiseFromStreams([
    recordStream,
    createCreateIndexStream({ client, stats, skipExisting, log }),
    createIndexDocRecordsStream(client, stats),
  ]);

  const result = stats.toJSON();

  // If we affected the Kibana index, we need to ensure it's migrated...
  if (Object.keys(result).some(k => k.startsWith('.kibana'))) {
    await migrateKibanaIndex({ client, log });
  }

  const indicesToRefresh = Object
    .entries(result)
    .filter(([, stats]) => !stats.deleted)
    .map(([index, { docs }]) => {
      log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
      return index;
    });

  await client.indices.refresh({
    index: indicesToRefresh
  });

  return result;
}
