/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve, relative, extname } from "path";
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
  createIndexDocRecordsStream,
  migrateSavedObjectIndices,
  Progress,
  createDefaultSpace,
} from '../lib';
import { IndexStats } from '../lib/stats';

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
}): Promise<Record<string, IndexStats>> {
  const name = relative(REPO_ROOT, inputDir);
  const stats = createStats(name, log);
  const files = prioritizeMappings(await readDirectory(inputDir));
  const kibanaPluginIds = await kbnClient.plugins.getEnabledIds();
  let docIsCompressed = false;

  // a single stream that emits records from all archive files, in
  // order, so that createIndexStream can track the state of indexes
  // across archives and properly skip docs from existing indexes
  const recordStream = concatStreamProviders(
    files.map((filename) => () => {
      log.info('[%s] Loading %j', name, filename);
      if (filename === 'data.json.gz') docIsCompressed = true;

      return streamDataAndErrorsFromFirst2LastStreamIgnoreErrorsOfLastStream(
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
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    createIndexDocRecordsStream(client, stats, progress, useCreate, docIsCompressed),
  ]);

  progress.deactivate();
  const result = stats.toJSON();

  const indicesWithDocs: string[] = [];

  for (const [index, { docs }] of Object.entries(result))
    if (indexingOccurred(docs)) indicesWithDocs.push(index);

  // If we affected saved objects indices, we need to ensure they are migrated...
  if (atLeastOne(hasDotKibanaPrefix(MAIN_SAVED_OBJECT_INDEX))(result)) {
    await freshenUp(client, indicesWithDocs);
    await migrateSavedObjectIndices(kbnClient);

    // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
    if (kibanaPluginIds.includes('spaces'))
      await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
  }
  return result;
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
