import { Transform } from 'stream';

import { deleteIndex } from './delete_index';

export function createDeleteIndexStream(client, stats) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          await deleteIndex(client, stats, record.value.index);
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
