import { Transform } from 'stream';

export function createUpgradeConfigDocsStream(kibanaVersion, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,

    transform(record, enc, callback) {
      try {
        if (record.isKibanaConfig) {
          if (record.value.id !== kibanaVersion) {
            stats.upgradedConfigDoc(record.value.index, kibanaVersion);
            record.value.id = kibanaVersion;
          } else {
            stats.upToDateConfigDoc(record.value.index, kibanaVersion);
          }
        }

        callback(null, record);
      } catch (err) {
        callback(err);
      }
    }
  });
}
