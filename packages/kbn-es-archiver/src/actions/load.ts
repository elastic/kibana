/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
  createIndexDocRecordsStream,
  migrateSavedObjectIndices,
  Progress,
  createDefaultSpace,
  type LoadActionPerfOptions,
} from '../lib';

import soOverrideAllowedList from '../fixtures/override_saved_objects_index/exception_list.json';

// pipe a series of streams into each other so that data and errors
// flow from the first stream to the last. Errors from the last stream
// are not listened for
const pipeline = (...streams: Readable[]) =>
  streams.reduce((source, dest) =>
    source.once('error', (error) => dest.destroy(error)).pipe(dest as any)
  );

const warningToUpdateArchive = (path: string) => {
  return `This test is using '${path}' archive that contains saved object index definitions (in the 'mappings.json').
This has proven to be a source of conflicts and flakiness, so the goal is to remove support for this feature ASAP. We kindly ask you to
update your test archives and remove SO index definitions, so that tests use the official saved object indices created by Kibana at startup.
You can achieve that by simply removing your saved object index definitions from 'mappings.json' (likely removing the file altogether).
We also recommend migrating existing tests to 'kbnArchiver' whenever possible. After the fix please remove archive path from the exception list:
${resolve(__dirname, '../fixtures/override_saved_objects_index/exception_list.json')}.
Find more information here: https://github.com/elastic/kibana/issues/161882`;
};

export async function loadAction({
  inputDir,
  skipExisting,
  useCreate,
  docsOnly,
  client,
  log,
  kbnClient,
  performance,
}: {
  inputDir: string;
  skipExisting: boolean;
  useCreate: boolean;
  docsOnly?: boolean;
  client: Client;
  log: ToolingLog;
  kbnClient: KbnClient;
  performance?: LoadActionPerfOptions;
}) {
  const name = relative(REPO_ROOT, inputDir);
  const isArchiveInExceptionList = soOverrideAllowedList.includes(name);
  if (isArchiveInExceptionList) {
    log.warning(warningToUpdateArchive(name));
  }
  const stats = createStats(name, log);
  const files = prioritizeMappings(await readDirectory(inputDir));
  const kibanaPluginIds = await kbnClient.plugins.getEnabledIds();

  // a single stream that emits records from all archive files, in
  // order, so that createIndexStream can track the state of indexes
  // across archives and properly skip docs from existing indexes
  const recordStream = concatStreamProviders(
    files.map((filename) => () => {
      log.info('[%s] Loading %j', name, filename);

      return pipeline(
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
    createCreateIndexStream({
      client,
      stats,
      skipExisting,
      docsOnly,
      isArchiveInExceptionList,
      log,
    }),
    createIndexDocRecordsStream(client, stats, progress, useCreate, performance),
  ]);

  progress.deactivate();
  const result = stats.toJSON();

  const indicesWithDocs: string[] = [];
  for (const [index, { docs }] of Object.entries(result)) {
    if (docs && docs.indexed > 0) {
      log.info('[%s] Indexed %d docs into %j', name, docs.indexed, index);
      indicesWithDocs.push(index);
    }
  }

  await client.indices.refresh(
    {
      index: indicesWithDocs.join(','),
      allow_no_indices: true,
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

  // If we affected saved objects indices, we need to ensure they are migrated...
  if (Object.keys(result).some((k) => k.startsWith(MAIN_SAVED_OBJECT_INDEX))) {
    await migrateSavedObjectIndices(kbnClient);
    log.debug('[%s] Migrated Kibana index after loading Kibana data', name);

    if (kibanaPluginIds.includes('spaces')) {
      // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
      await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
      log.debug(`[%s] Ensured that default space exists in ${MAIN_SAVED_OBJECT_INDEX}`, name);
    }
  }

  return result;
}
