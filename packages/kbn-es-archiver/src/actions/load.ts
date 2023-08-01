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
import { createPromiseFromStreams } from '@kbn/utils';
import { MAIN_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  atLeastOne,
  docIndicesPushFactory,
  freshenUp,
  hasDotKibanaPrefix,
  indexingOccurred,
  readablesToReadable,
  recordStream,
} from './load_utils';

import {
  isGzip,
  createStats,
  createParseArchiveStreams,
  createCreateIndexStream,
  createIndexDocRecordsStream,
  migrateSavedObjectIndices,
  Progress,
  createDefaultSpace,
} from '../lib';
import { IndexStats } from '../lib/stats';

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
  const archiveRelativePath = relative(REPO_ROOT, inputDir);
  const stats = createStats(archiveRelativePath, log);

  const fnFactoryForMappingsAndDataFiles = (filename: string) =>
    function pipeline(): Readable {
      console.log(`\nλjs inputDir: \n\t${inputDir}`);
      console.log(`\nλjs filename: \n\t${filename}`);

      // Spread out the transform streams Array
      return readablesToReadable(
        createReadStream(resolve(inputDir, filename)),
        // ...streamXformations({ gzip: isGzip(filename) })
        ...createParseArchiveStreams({ gzip: isGzip(filename) })
      );
    };

  const progress = new Progress();
  progress.activate(log);

  // const recStreamAsString = await readableToString(recordStream(fnFactoryForMappingsAndDataFiles));
  // console.log(`\nλjs recStreamAsString: \n${JSON.stringify(recStreamAsString, null, 2)}`);

  await createPromiseFromStreams([
    await recordStream(fnFactoryForMappingsAndDataFiles, inputDir),
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    createIndexDocRecordsStream(client, stats, progress, inputDir, useCreate),
  ]);

  progress.deactivate();
  const xs = stats.toJSON();

  const indicesWithDocs: string[] = [];

  const push = docIndicesPushFactory(indicesWithDocs);
  // TODO-TRE: Clean up the following line. Kinda ugly
  for (const [index, { docs }] of Object.entries(xs)) if (indexingOccurred(docs)) push(index);

  // If we affected saved objects indices, we need to ensure they are migrated...
  if (atLeastOne(hasDotKibanaPrefix(MAIN_SAVED_OBJECT_INDEX))(xs)) {
    await freshenUp(client, indicesWithDocs);
    await migrateSavedObjectIndices(kbnClient);

    // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
    if ((await kbnClient.plugins.getEnabledIds()).includes('spaces'))
      await createDefaultSpace({ client, index: MAIN_SAVED_OBJECT_INDEX });
  }
  return xs;
}
