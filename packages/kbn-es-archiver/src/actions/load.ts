/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, relative } from 'path';
import { createReadStream } from 'fs';
import { PassThrough, Readable } from 'stream';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import { concatStreamProviders } from '@kbn/utils';

import {
  isGzip,
  createStats,
  createParseArchiveStreams,

  // createIndexDocRecordsStream,
} from '../lib';
import { begin } from './load_serverless';

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
  begin(name);
  // process.exit(666); // Trez Exit Expression
  // await createPromiseFromStreams([
  //   // This used to be  const recordStream = concatStreamProviders()...
  //   bothFiles$(inputDir, prioritizeMappings(await readDirectory(inputDir))),
  //   createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
  //   createIndexDocRecordsStreamWithoutProgess(client, stats, useCreate),
  //   // createIndexDocRecordsStream(client, stats, progress, useCreate),
  //   // createIndexDocRecordsStreamSvrLess(client, stats, useCreate),
  // ]);
  //
  // const result = stats.toJSON();
  //
  // const indicesWithDocs: string[] = [];
  // for (const [index, { docs }] of Object.entries(result))
  //   if (indexingOccurred(docs)) indicesWithDocs.push(index);
  //
  // await freshenUp(client, indicesWithDocs);
  //
  // // If we affected saved objects indices, we need to ensure they are migrated...
  // if (atLeastOne(hasDotKibanaPrefix(MAIN_SAVED_OBJECT_INDEX))(result)) {
  //   await migrateSavedObjectIndices(kbnClient);
  //   // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
  //   if ((await kbnClient.plugins.getEnabledIds()).includes('spaces'))
  //     await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
  // }
  // return result;
  //
  // // a single stream that emits records from all archive files, in
  // // order, so that createIndexStream can track the state of indexes
  // // across archives and properly skip docs from existing indexes
  function bothFiles$(
    archiveDirectory: string,
    maybeMappingsAndDocsFileNamesFromArchive: string[]
  ): PassThrough {
    return concatStreamProviders(
      maybeMappingsAndDocsFileNamesFromArchive.map((filename: string) => () => {
        return pipeline(
          createReadStream(resolve(archiveDirectory, filename)),
          ...createParseArchiveStreams({ gzip: isGzip(filename) })
        );
      }),
      { objectMode: true }
    );
  }
}
