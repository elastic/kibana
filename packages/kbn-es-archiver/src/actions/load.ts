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

import { ordered, readableFactory, complete } from './load_utils';
import type { IndexStats } from '../lib';
import { createStats, createCreateIndexStream, createIndexDocRecordsStream } from '../lib';

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
  const readable$Fns = readableFactory(log)(inputDir)(name);
  const mode = {
    objectMode: true,
  };

  await createPromiseFromStreams([
    // a single stream that emits records from all archive files, in order, so that createIndexStream can track the state of indexes across archives and properly skip docs from existing indexes
    concatStreamProviders((await ordered(inputDir)).map(readable$Fns), mode),
    createCreateIndexStream({ client, stats, skipExisting, docsOnly, log }),
    createIndexDocRecordsStream(client, stats, useCreate),
  ]);

  return await complete(kbnClient)(client)(stats.toJSON());
}
