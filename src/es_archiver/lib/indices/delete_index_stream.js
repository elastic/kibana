import { Transform } from 'stream';

import { get } from 'lodash';

export function createDeleteIndexStream(client, stats) {

  async function deleteIndex(index) {
    try {
      await client.indices.delete({ index });
      stats.deletedIndex(index);
    } catch (err) {
      if (get(err, 'body.error.type') !== 'index_not_found_exception') {
        throw err;
      }
    }
  }

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        if (!record || record.type === 'index') {
          await deleteIndex(record.value.index);
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
