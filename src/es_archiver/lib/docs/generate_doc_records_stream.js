import { Transform } from 'stream';

const SCROLL_SIZE = 1000;
const SCROLL_TIMEOUT = '1m';

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
              scroll: SCROLL_TIMEOUT,
              size: SCROLL_SIZE,
              _source: true
            });
            remainingHits = resp.hits.total;
          } else {
            resp = await client.scroll({
              scroll: SCROLL_TIMEOUT,
              scrollId: resp._scroll_id,
            });
          }

          for (const hit of resp.hits.hits) {
            remainingHits -= 1;
            stats.archivedDoc(hit._index);
            this.push({
              type: 'doc',
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
