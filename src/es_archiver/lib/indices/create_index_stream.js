import { Transform } from 'stream';

import { get, once } from 'lodash';

import { deleteIndex } from './delete_index';

export function createCreateIndexStream({ client, stats, skipExisting, log }) {
  const skipDocsFromIndices = new Set();

  // If we're trying to import Kibana index docs, we need to ensure that
  // previous indices are removed so we're starting w/ a clean slate for
  // migrations. This only needs to be done once per archive load operation.
  // For the '.kibana' index, we will ignore 'skipExisting' and always load.
  const clearKibanaIndices = once(async () => {
    const kibanaIndices = await client.cat.indices({ index: '.kibana*', format: 'json' });
    const indexNames = kibanaIndices.map(x => x.index);
    if (!indexNames.length) {
      return;
    }
    await client.indices.putSettings({
      index: indexNames,
      body: { index: { blocks: { read_only: false } } },
    });
    await client.indices.delete({ index: indexNames });
    indexNames.forEach(stats.deletedIndex);
  });

  async function handleDoc(stream, record) {
    if (skipDocsFromIndices.has(record.value.index)) {
      return;
    }

    stream.push(record);
  }

  async function handleIndex(stream, record) {
    const { index, settings, mappings, aliases } = record.value;

    async function attemptToCreate(attemptNumber = 1) {
      try {
        if (index.startsWith('.kibana')) {
          await clearKibanaIndices();
        }
        await client.indices.create({
          method: 'PUT',
          index,
          body: { settings, mappings, aliases },
        });
        stats.createdIndex(index, { settings });
      } catch (err) {
        const errorType = get(err, 'body.error.type');
        const isExistingIndexOrAlias = (errorType === 'resource_already_exists_exception' || errorType === 'invalid_index_name_exception');
        if (!isExistingIndexOrAlias || attemptNumber >= 3) {
          throw err;
        }

        if (skipExisting) {
          skipDocsFromIndices.add(index);
          stats.skippedIndex(index);
          return;
        }

        if (await client.indices.existsAlias({ name: index })) {
          log.debug(`Deleting alias ${index} and associated indices.`);
          const alias = await client.indices.getAlias({ name: index });
          await Promise.all(Object.keys(alias).map(index => client.indices.delete({ index })));
        } else {
          await deleteIndex({ client, stats, index, log });
        }
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
