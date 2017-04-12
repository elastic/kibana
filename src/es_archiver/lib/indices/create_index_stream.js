import { Transform } from 'stream';

import { get } from 'lodash';

export function createCreateIndexStream({ client, stats, skipExisting }) {
  const skipDocsFromIndices = new Set();

  async function handleDoc(stream, record) {
    if (skipDocsFromIndices.has(record.value.index)) {
      return;
    }

    stream.push(record);
  }

  async function handleIndex(stream, record) {
    const { index, settings, mappings } = record.value;

    async function attemptToCreate(attemptNumber = 1) {
      try {
        await client.indices.create({
          method: 'PUT',
          index,
          body: { settings, mappings },
        });
        stats.createdIndex(index, { settings });
      } catch (err) {
        if (get(err, 'body.error.type') !== 'index_already_exists_exception' || attemptNumber >= 3) {
          throw err;
        }

        if (skipExisting) {
          skipDocsFromIndices.add(index);
          stats.skippedIndex(index);
          return;
        }

        await client.indices.delete({ index });
        stats.deletedIndex(index);
        await attemptToCreate(attemptNumber + 1);
        return;
      }
    }

    await attemptToCreate();
  }

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        switch (record && record.type) {
          case 'index':
            await handleIndex(this, record);
            break;

          case 'doc':
            await handleDoc(this, record);
            break;

          default:
            this.push(record);
            break;
        }

        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
