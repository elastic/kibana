import { Writable } from 'stream';

export function createIndexDocRecordsStream(client, stats) {

  async function indexDocs(docs) {
    const body = [];

    docs.forEach(doc => {
      stats.indexedDoc(doc.index);
      body.push(
        {
          index: {
            _index: doc.index,
            _type: doc.type,
            _id: doc.id,
          }
        },
        doc.source
      );
    });

    const resp = await client.bulk({ body });
    if (resp.errors) {
      throw new Error(`Failed to index all documents: ${JSON.stringify(resp, null, 2)}`);
    }
  }

  return new Writable({
    highWaterMark: 1000,
    objectMode: true,

    async write(record, enc, callback) {
      try {
        await indexDocs([record.value]);
        callback(null);
      } catch (err) {
        callback(err);
      }
    },

    async writev(chunks, callback) {
      try {
        await indexDocs(chunks.map(({ chunk: record }) => record.value));
        callback(null);
      } catch (err) {
        callback(err);
      }
    },
  });
}
