import readline from 'readline';
import fs from 'fs';

const BULK_LOAD_SIZE = 250;

export function loadData(path, bulkLoad, index, updateRow, callback) {
  let count = 0;
  let bulk = [];
  const lineStream = readline.createInterface({
    input: fs.createReadStream(path)
  });

  lineStream.on('line', (line) => {
    count++;
    const insertCmd = {
      index: {
        _index: index
      }
    };
    bulk.push(insertCmd);
    bulk.push(line);
    if (bulk.length >= BULK_LOAD_SIZE * 2) {
      bulkLoad(bulk);
      bulk = [];
    }
  });

  lineStream.on('close', async () => {
    // finished loading
    if (bulk.length > 0) {
      try {
        await bulkLoad(bulk);
      } catch (err) {
        callback(err);
      }
    }

    callback(null, count);
  });
}
