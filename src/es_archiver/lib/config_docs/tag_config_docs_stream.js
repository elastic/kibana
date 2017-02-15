import { Transform } from 'stream';

export function createTagConfigDocsStream(kibanaVersion, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,

    transform(record, enc, callback) {
      try {
        if (
          record.type === 'hit' &&
          record.value.index === '.kibana' &&
          record.value.type === 'config' &&
          record.value.id === kibanaVersion
        ) {
          stats.taggedConfigDoc(record.value.index, kibanaVersion);
          record.isKibanaConfig = true;
        }

        callback(null, record);
      } catch (err) {
        callback(err);
      }
    }
  });
}
