/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { deleteDataStream } from './delete_data_stream';
import { isSavedObjectIndex } from './kibana_index';

/**
 * An index or data stream that a load created, and can therefore roll back.
 */
export type CreatedTarget = { index: string } | { dataStream: string; template: string };

/**
 * Delete the indices and data streams a load created, so that a load which failed part way through
 * does not leave targets behind that a later `skipExisting` load reads as fully restored.
 */
export const deleteCreatedTargets = async ({
  client,
  stats,
  log,
  createdTargets,
}: {
  client: Client;
  stats: Stats;
  log: ToolingLog;
  createdTargets: readonly CreatedTarget[];
}): Promise<void> => {
  for (const target of createdTargets) {
    const name = 'dataStream' in target ? target.dataStream : target.index;

    // Kibana keeps running against the saved object indices and recreates them through migrations,
    // so dropping them here would leave it without any at all, a wider failure than the one we undo.
    if ('index' in target && isSavedObjectIndex(target.index)) {
      log.warning('Leaving saved object index %j in place after the failed load', name);
      continue;
    }

    try {
      if ('dataStream' in target) {
        await deleteDataStream(client, target.dataStream, target.template);
        stats.deletedDataStream(target.dataStream, target.template);
      } else {
        await deleteIndex({ client, stats, index: target.index, log });
      }
    } catch (error) {
      // Whatever broke the load often breaks the rollback too, and that error is the useful one,
      // so report the failed cleanup and keep going rather than replacing it.
      log.warning('Failed to roll back %j after the failed load: %s', name, error.message);
    }
  }
};
