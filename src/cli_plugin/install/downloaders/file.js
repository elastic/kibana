import Progress from '../progress';
import { createWriteStream, createReadStream, statSync } from 'fs';

function openSourceFile({ sourcePath }) {
  try {
    const fileInfo = statSync(sourcePath);

    const readStream = createReadStream(sourcePath);

    return { readStream, fileInfo };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('ENOTFOUND');
    }

    throw err;
  }
}

async function copyFile({ readStream, writeStream, progress }) {
  await new Promise((resolve, reject) => {
    // if either stream errors, fail quickly
    readStream.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we transfer
    readStream.on('data', (chunk) => {
      progress.progress(chunk.length);
    });

    // write the download to the file system
    readStream.pipe(writeStream);

    // when the write is done, we are done
    writeStream.on('finish', resolve);
  });
}

/*
// Responsible for managing local file transfers
*/
export default async function copyLocalFile(logger, sourcePath, targetPath) {
  try {
    const { readStream, fileInfo } = openSourceFile({ sourcePath });
    const writeStream = createWriteStream(targetPath);

    try {
      const progress = new Progress(logger);
      progress.init(fileInfo.size);

      await copyFile({ readStream, writeStream, progress });

      progress.complete();
    } catch (err) {
      readStream.close();
      writeStream.close();
      throw err;
    }
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
