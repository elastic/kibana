/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Transform } from 'stream';
import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';

import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { cleanKibanaIndices } from './kibana_index';
import { deleteDataStream } from './delete_data_stream';

export function createDeleteIndexStream(client: Client, stats: Stats, log: ToolingLog) {
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

          if (index.startsWith('.kibana')) {
            await cleanKibanaIndices({ client, stats, log });
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
          this.push(record);
        }
        callback();
      } catch (err) {
        callback(err);
      }
    },
  });
}
