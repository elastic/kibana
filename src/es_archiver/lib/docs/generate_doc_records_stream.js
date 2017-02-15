import { Transform } from 'stream';

export function createGenerateDocRecordsStream(client, stats) {
  return new Transform({
    writableObjectMode: true,
    readableObjectMode: true,
    async transform(index, enc, callback) {
      try {
        let remainingHits = null;
        let resp = null;

        while (!resp || remainingHits > 0) {
          if (!resp) {
            resp = await client.search({
              index: index,
              scroll: '1m',
              size: 1000,
              _source: true
            });
            remainingHits = resp.hits.total;
          } else {
            resp = await client.scroll({
              scrollId: resp._scroll_id,
              scroll: '1m'
            });
          }

          for (const hit of resp.hits.hits) {
            remainingHits -= 1;
            stats.archivingDoc(hit._index);
            this.push({
              type: 'hit',
              value: {
                index: hit._index,
                type: hit._type,
                id: hit._id,
                source: hit._source,
              }
            });
          }
        }

        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
