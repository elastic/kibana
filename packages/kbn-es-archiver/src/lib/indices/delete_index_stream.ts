/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Transform } from 'stream';
import { Client } from 'elasticsearch';
import { ToolingLog } from '@kbn/dev-utils';

import { Stats } from '../stats';
import { deleteIndex } from './delete_index';
import { cleanKibanaIndices } from './kibana_index';

export function createDeleteIndexStream(
  client: Client,
  stats: Stats,
  log: ToolingLog,
  kibanaPluginIds: string[]
) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          const { index } = record.value;

          if (index.startsWith('.kibana')) {
            await cleanKibanaIndices({ client, stats, log, kibanaPluginIds });
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
