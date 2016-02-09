import getProgressReporter from '../progress_reporter';
import { createWriteStream, createReadStream, unlinkSync, statSync } from 'fs';
import fileType from '../file_type';

function openSourceFile({ sourcePath }) {
  try {
    let fileInfo = statSync(sourcePath);

    const readStream = createReadStream(sourcePath);

    return { readStream, fileInfo };
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('ENOTFOUND');
    }

    throw err;
  }
}

async function copyFile({ readStream, writeStream, progressReporter }) {
  await new Promise((resolve, reject) => {
    // if either stream errors, fail quickly
    readStream.on('error', reject);
    writeStream.on('error', reject);

    // report progress as we transfer
    readStream.on('data', (chunk) => {
      progressReporter.progress(chunk.length);
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
      const progressReporter = getProgressReporter(logger);
      progressReporter.init(fileInfo.size);

      await copyFile({ readStream, writeStream, progressReporter });

      progressReporter.complete();
    } catch (err) {
      readStream.close();
      writeStream.close();
      throw err;
    }

    // all is well, return our archive type
    const archiveType = fileType(sourcePath);
    return { archiveType };
  } catch (err) {
    logger.error(err);
    throw err;
  }
};
