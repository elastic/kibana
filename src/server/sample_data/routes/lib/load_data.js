import readline from 'readline';
import fs from 'fs';
import zlib from 'zlib';

const BULK_INSERT_SIZE = 500;

export function loadData(path, bulkInsert, callback) {
  let count = 0;
  let docs = [];
  let isPaused = false;

  const readStream = fs.createReadStream(path, {
    // pause does not stop lines already in buffer. Use smaller buffer size to avoid bulk inserting to many records
    highWaterMark: 1024 * 4
  });
  const lineStream = readline.createInterface({
    input: readStream.pipe(zlib.Unzip()) // eslint-disable-line new-cap
  });

  const onClose = async () => {
    if (docs.length > 0) {
      try {
        await bulkInsert(docs);
      } catch (err) {
        callback(err);
        return;
      }
    }
    callback(null, count);
  };
  lineStream.on('close', onClose);

  function closeWithError(err) {
    lineStream.removeListener('close', onClose);
    lineStream.close();
    callback(err);
  }

  lineStream.on('line', async (line) => {
    if (line.length === 0 || line.charAt(0) === '#') {
      return;
    }

    let doc;
    try {
      doc = JSON.parse(line);
    } catch (err) {
      closeWithError(new Error(`Unable to parse line as JSON document, line: """${line}""", Error: ${err.message}`));
      return;
    }

    count++;
    docs.push(doc);

    if (docs.length >= BULK_INSERT_SIZE && !isPaused) {
      lineStream.pause();

      // readline pause is leaky and events in buffer still get sent after pause
      // need to clear buffer before async call
      const docstmp = docs.slice();
      docs = [];
      try {
        await bulkInsert(docstmp);
        lineStream.resume();
      } catch (err) {
        closeWithError(err);
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
