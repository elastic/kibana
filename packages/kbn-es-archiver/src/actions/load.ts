/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { relative } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import { createPromiseFromStreams, concatStreamProviders } from '@kbn/utils';

import { ordered, readableFactory, complete, warningToUpdateArchive } from './load_utils';
import { createStats, createCreateIndexStream, indexDocRecordsWritable$ } from '../lib';
import soOverrideAllowedList from '../fixtures/override_saved_objects_index/exception_list.json';
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
  const isArchiveInExceptionList = soOverrideAllowedList.includes(name);
  if (isArchiveInExceptionList) log.warning(warningToUpdateArchive(name));

  const stats = createStats(name, log);
  const readable$Fns = readableFactory(log)(inputDir)(name);

  await createPromiseFromStreams([
    // a single stream that emits records from all archive files, in
    // order, so that createIndexStream can track the state of indexes
    // across archives and properly skip docs from existing indexes
    concatStreamProviders((await ordered(inputDir)).map(readable$Fns), {
      objectMode: true,
    }),
    createCreateIndexStream({
      client,
      stats,
      skipExisting,
      docsOnly,
      isArchiveInExceptionList,
      log,
    }),
    indexDocRecordsWritable$(client, stats, useCreate),
  ]);

  return await complete(kbnClient)(client)(stats.toJSON());
}
