import { createHash } from 'crypto';
import { createReadStream } from 'fs';

/**
 * Wait for a readable stream to end
 * @param  {Stream.Readable} stream
 * @return {Promise<undefined>}
 */
function readableEnd(stream) {
  return new Promise((resolve, reject) => {
    stream.on('error', reject).on('end', resolve);
  });
}


export async function calculateMd5(path) {
  const hash = createHash('md5');
  await readableEnd(
    createReadStream(path)
      .on('data', chunk => hash.update(chunk))
  );
  return hash.digest('hex');
}
