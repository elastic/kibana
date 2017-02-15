import { Transform } from 'stream';

export function createDeleteIndexStream({ client, stats, skipExisting }) {
  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        switch (record.type) {
          case 'index':
            const { index } = record.value;
            if (await client.indices.exists({ index })) {
              stats.deleting(index);
              await client.indices.delete({ index });
            }
            break;

          default:
            this.push(record);
            break;
        }

        callback();
      } catch (err) {
        callback(err);
      }
    }
  });
}
