/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import { ToolingLog } from '@kbn/dev-utils';

import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { cleanSavedObjectIndices } from './kibana_index';
import { MAIN_SAVED_OBJECT_INDEX, TASK_MANAGER_SAVED_OBJECT_INDEX } from './constants';

export function createDeleteIndexStream(client: KibanaClient, stats: Stats, log: ToolingLog) {
  // if we detect saved object documents defined in the data.json, we will cleanup their indices
  let savedObjectIndicesAlreadyCleaned = false;
  let taskManagerIndexAlreadyCleaned = false;

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          const { index } = record.value;

          if (index.startsWith(TASK_MANAGER_SAVED_OBJECT_INDEX)) {
            if (!taskManagerIndexAlreadyCleaned) {
              await cleanSavedObjectIndices({ client, stats, index, log });
              taskManagerIndexAlreadyCleaned = true;
              log.debug(`Cleaned saved object index [${index}]`);
            }
          } else if (index.startsWith(MAIN_SAVED_OBJECT_INDEX)) {
            if (!savedObjectIndicesAlreadyCleaned) {
              await cleanSavedObjectIndices({ client, stats, log });
              savedObjectIndicesAlreadyCleaned = taskManagerIndexAlreadyCleaned = true;
              log.debug(`Cleaned all saved object indices`);
            }
          } else {
            await deleteIndex({ client, stats, log, index });
          }
        } else {
          this.push(record);
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
