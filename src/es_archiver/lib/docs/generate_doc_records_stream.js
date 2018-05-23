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

        const alias = await client.indices.getAlias({ index });

        if (!isEmpty(alias[index].aliases)) {
          this.push({
            type: 'alias',
            value: {
              index,
              aliases: alias[index].aliases,
            },
          });
        }

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
              scrollId: resp._scroll_id,
              scroll: SCROLL_TIMEOUT
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

function isEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}
