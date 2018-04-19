import readline from 'readline';
import fs from 'fs';

const BULK_LOAD_SIZE = 500;

export function loadData(path, bulkLoad, index, updateRow, callback) {
  let count = 0;
  let bulk = [];
  let isPaused = false;
  const lineStream = readline.createInterface({
    input: fs.createReadStream(path, {
      // pause does not stop lines already in buffer. Use smaller buffer size to avoid bulk inserting to many records
      highWaterMark: 1024 * 4
    })
  });

  const onClose = async () => {
    if (bulk.length > 0) {
      try {
        await bulkLoad(bulk);
      } catch (err) {
        callback(err);
        return;
      }
    }
    callback(null, count);
  };
  lineStream.on('close', onClose);

  lineStream.on('line', async (line) => {
    count++;
    const insertCmd = {
      index: {
        _index: index
      }
    };
    bulk.push(insertCmd);
    bulk.push(line);
    if (bulk.length >= BULK_LOAD_SIZE * 2 && !isPaused) {
      lineStream.pause();

      // readline pause is leaky and events in buffer still get sent after pause
      // need to clear buffer before async call
      const bulktmp = bulk.slice();
      bulk = [];
      try {
        await bulkLoad(bulktmp);
        lineStream.resume();
      } catch (err) {
        lineStream.removeListener('close', onClose);
        lineStream.close();
        callback(err);
      }
    }
  });

  lineStream.on('pause', async () => {
    isPaused = true;
  });

  lineStream.on('resume', async () => {
    isPaused = false;
  });
}
