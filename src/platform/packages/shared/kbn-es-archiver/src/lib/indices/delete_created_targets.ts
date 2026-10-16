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

export type CreatedTarget =
  | { type: 'index'; name: string }
  | { type: 'data_stream'; name: string; template: string };

/**
 * Delete the indices and data streams an archive load created, so a load that fails part way
 * through does not leave a partially indexed target behind for the next load to adopt.
 */
export async function deleteCreatedTargets({
  client,
  stats,
  log,
  targets,
}: {
  client: Client;
  stats: Stats;
  log: ToolingLog;
  targets: readonly CreatedTarget[];
}): Promise<void> {
  for (const target of targets) {
    try {
      if (target.type === 'data_stream') {
        await deleteDataStream(client, target.name, target.template);
        stats.deletedDataStream(target.name, target.template);
      } else {
        await deleteIndex({ client, stats, index: target.name, log });
      }
    } catch (error) {
      log.warning(
        `Failed to delete ${target.type} %j created by this archive load: ${error.message}`,
        target.name
      );
    }
  }
}
