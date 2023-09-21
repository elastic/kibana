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
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import { createPromiseFromStreams, concatStreamProviders } from '@kbn/utils';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { ES_CLIENT_HEADERS } from '../client_headers';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createCreateIndexStream,
  // createIndexDocRecordsStream,
  createIndexDocRecordsStreamSRVRLESS,
  migrateSavedObjectIndices,
  createDefaultSpace,
} from '../lib';

// pipe a series of streams into each other so that data and errors
// flow from the first stream to the last. Errors from the last stream
// are not listened for
const streamDataAndErrorsFromFirst2LastStreamIgnoreErrorsOfLastStream = (...streams: Readable[]) =>
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

  const mapFactory = (archiveDir: string) => (archiveName: string) => (fileName: string) => () => {
    log.verbose('[%s] Loading %j', archiveName, fileName);
    return streamDataAndErrorsFromFirst2LastStreamIgnoreErrorsOfLastStream(
      createReadStream(resolve(archiveDir, fileName)),
      ...createParseArchiveStreams({ gzip: isGzip(fileName) })
    );
  };
  // a single stream that emits records from all archive files, in
  // order, so that createIndexStream can track the state of indexes
  // across archives and properly skip docs from existing indexes
  const recordStream = concatStreamProviders(
    prioritizeMappings(await readDirectory(inputDir)).map(mapFactory(inputDir)(name)),
    { objectMode: true }
  );

  await createPromiseFromStreams([
    recordStream,
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    createIndexDocRecordsStreamSRVRLESS(client, stats, useCreate),
  ]);

  const complete = async () => {
    const result = stats.toJSON();

    const indicesWithDocs: string[] = [];
    for (const [index, { docs }] of Object.entries(result))
      if (indexingOccurred(docs)) indicesWithDocs.push(index);

    // If we affected saved objects indices, we need to ensure they are migrated...
    if (atLeastOne(hasDotKibanaPrefix(MAIN_SAVED_OBJECT_INDEX))(result)) {
      await freshenUp(client, indicesWithDocs);
      await migrateSavedObjectIndices(kbnClient);

      // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
      if ((await kbnClient.plugins.getEnabledIds()).includes('spaces'))
        await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
    }
  };
  await complete();
}
function atLeastOne(predicate: {
  (x: string): boolean;
  (value: string, index: number, array: string[]): unknown;
}) {
  return (result: {}) => Object.keys(result).some(predicate);
}
function indexingOccurred(docs: { indexed: any; archived?: number }) {
  return docs && docs.indexed > 0;
}
async function freshenUp(client: Client, indicesWithDocs: string[]): Promise<void> {
  await client.indices.refresh(
    {
      index: indicesWithDocs.join(','),
      allow_no_indices: true,
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );
}
function hasDotKibanaPrefix(mainSOIndex: string) {
  return (x: string) => x.startsWith(mainSOIndex);
}
