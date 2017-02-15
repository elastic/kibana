import { Transform } from 'stream';

export function createCreateIndexStream({ client, stats, skipExisting }) {
  const preexistingIndexes = new Set();

  async function handleDoc(stream, record) {
    if (skipExisting && preexistingIndexes.has(record.value.index)) {
      return;
    }

    stream.push(record);
  }

  async function handleIndex(stream, record) {
    const { index, settings, mappings } = record.value;
    if (await client.indices.exists({ index })) {
      preexistingIndexes.add(index);
      if (skipExisting) {
        stats.skipping(index);
        return;
      }

      stats.deleting(index);
      await client.indices.delete({ index });
    }

    stats.creating(index, { settings });
    await client.indices.create({
      method: 'PUT',
      index,
      body: { settings, mappings }
    });
  }

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: true,
    async transform(record, enc, callback) {
      try {
        switch (record.type) {
          case 'index':
            await handleIndex(this, record);
            break;

          case 'hit':
            await handleDoc(this, record);
            break;

          default:
            throw new Error(`unexpected record type "${record.type}"`);
        }

        callback(null);
      } catch (err) {
        callback(err);
      }
    }
  });
}
