/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Transform } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import {
  MAIN_SAVED_OBJECT_INDEX,
  TASK_MANAGER_SAVED_OBJECT_INDEX,
} from '@kbn/core-saved-objects-server';
import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { cleanSavedObjectIndices } from './kibana_index';
import { deleteDataStream } from './delete_data_stream';

export function createDeleteIndexStream(client: Client, stats: Stats, log: ToolingLog) {
  // if we detect saved object documents defined in the data.json, we will cleanup their indices
  let kibanaIndicesAlreadyCleaned = false;
  let kibanaTaskManagerIndexAlreadyCleaned = false;

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record) {
          log.warning(`deleteIndexStream: empty index provided`);
          return callback();
        }
        if (record.type === 'index') {
          const { index } = record.value;

          if (index.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX)) {
            if (!kibanaTaskManagerIndexAlreadyCleaned) {
              await cleanSavedObjectIndices({ client, stats, index, log });
              kibanaTaskManagerIndexAlreadyCleaned = true;
              log.debug(`Cleaned saved object index [${index}]`);
            }
          } else if (index.startsWith(MAIN_SAVED_OBJECT_INDEX)) {
            if (!kibanaIndicesAlreadyCleaned) {
              await cleanSavedObjectIndices({ client, stats, log });
              kibanaIndicesAlreadyCleaned = kibanaTaskManagerIndexAlreadyCleaned = true;
              log.debug(`Cleaned all saved object indices`);
            }
          } else {
            await deleteIndex({ client, stats, log, index });
          }
        } else if (record.type === 'data_stream') {
          const {
            data_stream: dataStream,
            template: { name },
          } = record.value;

          await deleteDataStream(client, dataStream, name);
          stats.deletedDataStream(dataStream, name);
        } else {
          if (record.type === 'doc') {
            const index = record.value.index;
            if (index.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX)) {
              if (!kibanaTaskManagerIndexAlreadyCleaned) {
                await cleanSavedObjectIndices({ client, stats, index, log });
                kibanaTaskManagerIndexAlreadyCleaned = true;
                log.debug(`Cleaned saved object index [${index}]`);
              }
            } else if (index.startsWith(MAIN_SAVED_OBJECT_INDEX)) {
              if (!kibanaIndicesAlreadyCleaned) {
                await cleanSavedObjectIndices({ client, stats, log });
                kibanaIndicesAlreadyCleaned = kibanaTaskManagerIndexAlreadyCleaned = true;
                log.debug(`Cleaned all saved object indices`);
              }
            }
          }
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
