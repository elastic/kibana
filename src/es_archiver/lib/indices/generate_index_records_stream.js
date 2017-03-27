import { Transform } from 'stream';

export function createGenerateIndexRecordsStream(client, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        const resp = await client.indices.get({
          index,
          feature: ['_settings', '_mappings'],
          filterPath: [
            // remove settings that aren't really settings
            '-*.settings.index.creation_date',
            '-*.settings.index.uuid',
            '-*.settings.index.version',
            '-*.settings.index.provided_name',
          ]
        });

        const { settings, mappings } = resp[index];
        stats.archivedIndex(index, { settings, mappings });
        callback(null, {
          type: 'index',
          value: {
            index,
            settings,
            mappings,
          }
        });
      } catch (err) {
        callback(err);
      }
    }
  });
}
