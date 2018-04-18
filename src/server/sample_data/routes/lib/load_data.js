import readline from 'readline';
import fs from 'fs';

export async function loadData(path, index, updateRow, callback) {
  let count = 0;
  const lineStream = readline.createInterface({
    input: fs.createReadStream(path)
  });

  lineStream.on('line', (line) => {
    count++;
  });

  lineStream.on('close', () => {
    // finished loading
    callback(count);
  });
}
