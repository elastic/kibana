/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { ToolingLog } from '@kbn/tooling-log';
import type { Client } from '@elastic/elasticsearch';
import { ShardsOperationResponseBase } from '@elastic/elasticsearch/lib/api/types';
import { MAIN_SAVED_OBJECT_INDEX as mainIdx } from '@kbn/core-saved-objects-server';
import type { KbnClient } from '@kbn/test';
import { ES_CLIENT_HEADERS } from '../client_headers';

import {
  migrateSavedObjectIndices as migrate,
  createDefaultSpace,
  IndexStats,
  prioritizeMappings,
  readDirectory,
} from '../lib';

import { isGzip, createParseArchiveStreams } from '../lib';

export const ordered = async (archiveDir: string) =>
  prioritizeMappings(await readDirectory(archiveDir));

export const readableFactory =
  (log: ToolingLog) => (archiveDir: string) => (archiveName: string) => (fileName: string) =>
    function readableStreams(): Readable {
      log.verbose('[%s] Loading %j', archiveName, fileName);
      return streamDataAndErrorsFromFirst2LastStreamIgnoreErrorsOfLastStream(
        createReadStream(resolve(archiveDir, fileName)),
        ...createParseArchiveStreams({ gzip: isGzip(fileName) })
      );
    };

export const atLeastOne =
  (predicate: { (x: string): boolean; (value: string, index: number, array: string[]): unknown }) =>
  (result: {}) =>
    Object.keys(result).some(predicate);

export const indexingOccurred = (docs: { indexed: any; archived?: number }): boolean =>
  docs && docs.indexed > 0;

export const refresh = async (
  client: Client,
  indicesWithDocs: string[]
): Promise<ShardsOperationResponseBase> =>
  await client.indices.refresh(
    {
      index: indicesWithDocs.join(','),
      allow_no_indices: true,
    },
    {
      headers: ES_CLIENT_HEADERS,
    }
  );

export const hasDotKibanaPrefix = (mainSOIndex: string) => (x: string) => x.startsWith(mainSOIndex);

export const streamDataAndErrorsFromFirst2LastStreamIgnoreErrorsOfLastStream = (
  ...streams: Readable[]
) =>
  streams.reduce((source, dest) =>
    source.once('error', (error) => dest.destroy(error)).pipe(dest as any)
  );

const indicesWithDocs = ([index, { docs }]: any) => (indexingOccurred(docs) ? index : undefined);
const spacesEnabled = async (kbnClient: KbnClient): Promise<boolean> =>
  (await kbnClient.plugins.getEnabledIds()).includes('spaces');

export const complete =
  (kbnClient: KbnClient) =>
  (client: Client) =>
  async (statsJson: Record<string, IndexStats>): Promise<Record<string, IndexStats>> => {
    await refresh(client, Object.entries(statsJson).map(indicesWithDocs));
    if (atLeastOne(hasDotKibanaPrefix(mainIdx))(statsJson)) {
      await migrate(kbnClient);
      if (await spacesEnabled(kbnClient)) await createDefaultSpace({ client, index: mainIdx }); // WARNING affected by #104081. Assumes 'spaces' saved objects are stored in MAIN_SAVED_OBJECT_INDEX
    }
    return statsJson;
  };
