import { Transform } from 'stream';

export function createGenerateIndexRecordsStream(client, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        const resp = await client.indices.get({
          index,
          filterPath: [
            '*.settings',
            '*.mappings',
            // remove settings that aren't really settings
            '-*.settings.index.creation_date',
            '-*.settings.index.uuid',
            '-*.settings.index.version',
            '-*.settings.index.provided_name',
          ]
        });

        const { [index]: { aliases } } = await client.indices.getAlias({ index });
        const { settings, mappings } = resp[index];

        stats.archivedIndex(index, { settings, mappings });
        this.push({
          type: 'index',
          value: {
            index,
            settings,
            mappings,
            aliases,
          }
        });

        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
