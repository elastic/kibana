import { Transform } from 'stream';

import { deleteIndex } from './delete_index';

export function createDeleteIndexStream(client, stats, log) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          await deleteIndex({ client, stats, log, index: record.value.index });
        } else {
          this.push(record);
        }
        callback();
      } catch (err) {
        callback(err);
      }
    }
  });
}
