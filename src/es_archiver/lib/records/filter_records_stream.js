import { Transform } from 'stream';

export function createFilterRecordsStream(type) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,

    transform(record, enc, callback) {
      if (record && record.type === type) {
        callback(null, record);
      } else {
        callback();
      }
    }
  });
}
