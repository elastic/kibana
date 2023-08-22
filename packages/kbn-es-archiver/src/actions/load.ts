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
import { pipe } from 'fp-ts/function';
import { atLeastOne, freshenUp, hasDotKibanaPrefix, indexingOccurred } from './load_utils';

import {
  isGzip,
  createStats,
  prioritizeMappings,
  readDirectory,
  createParseArchiveStreams,
  createCreateIndexStream,
  // createIndexDocRecordsStream,
  createIndexDocRecordsStreamSvrLess,
  migrateSavedObjectIndices,
  // Progress,
  createDefaultSpace,
} from '../lib';

// pipe a series of streams into each other so that data and errors
// flow from the first stream to the last. Errors from the last stream
// are not listened for
const streamsReducer = (streamsAccumulator, destination$) =>
  streamsAccumulator
    .once('error', (error: any) => destination$.destroy(error))
    .pipe(destination$ as any);

const foldStreamsButIgnoreLastStreamErrors = (...streams: Readable[]) =>
  streams.reduce(streamsReducer);

const logLoad = (generalName: string) => (log: ToolingLog) => (mappingsOrArchiveName: string) => {
  log.info('[%s] Loading %j', generalName, mappingsOrArchiveName);
  // console.info('[%s] Loading %j', generalName, mappingsOrArchiveName);
  return mappingsOrArchiveName;
};
const res = (dir: string) => (file: string) => resolve(dir, file);

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
  const archiveGeneralName = relative(REPO_ROOT, inputDir);
  const stats = createStats(archiveGeneralName, log);
  const uniteLazy = (eitherMappingsFileOrArchiveFileName: string) => () =>
    foldStreamsButIgnoreLastStreamErrors(
      pipe(
        eitherMappingsFileOrArchiveFileName,
        logLoad(archiveGeneralName)(log),
        res(inputDir),
        createReadStream
      ),
      ...createParseArchiveStreams({ gzip: isGzip(eitherMappingsFileOrArchiveFileName) })
    );

  const recordsFromMappingsAndArchiveOrdered = concatStreamProviders(
    prioritizeMappings(await readDirectory(inputDir)).map(uniteLazy),
    { objectMode: true }
  );

  // const progress = new Progress();
  // progress.activate(log);

  await createPromiseFromStreams([
    recordsFromMappingsAndArchiveOrdered,
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    // createIndexDocRecordsStream(client, stats, progress, useCreate),
    createIndexDocRecordsStreamSvrLess(client, stats, useCreate),
  ]);

  // progress.deactivate();
  const result = stats.toJSON();

  const indicesWithDocs: string[] = [];

  for (const [index, { docs }] of Object.entries(result))
    if (indexingOccurred(docs)) indicesWithDocs.push(index);

  // If we affected saved objects indices, we need to ensure they are migrated...
  if (atLeastOne(hasDotKibanaPrefix(MAIN_SAVED_OBJECT_INDEX))(result)) {
    await freshenUp(client, indicesWithDocs);
    await migrateSavedObjectIndices(kbnClient);

    // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
    if ((await kbnClient.plugins.getEnabledIds()).includes('spaces')) {
      await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
      log.debug(
        `[%s] Ensured that default space exists in ${MAIN_SAVED_OBJECT_INDEX}`,
        archiveGeneralName
      );
    }
  }

  return result;
}
