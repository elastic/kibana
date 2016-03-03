import zlib from 'zlib';
import fs from 'fs';
import tar from 'tar';

async function extractArchive(settings) {
  await new Promise((resolve, reject) => {
    const gunzip = zlib.createGunzip();
    const tarExtract = new tar.Extract({ path: settings.workingPath, strip: 1 });
    const readStream = fs.createReadStream(settings.tempArchiveFile);

    readStream.on('error', reject);
    gunzip.on('error', reject);
    tarExtract.on('error', reject);

    readStream
    .pipe(gunzip)
    .pipe(tarExtract);

    tarExtract.on('finish', resolve);
  });
}

export default async function extractTarball(settings, logger) {
  try {
    logger.log('Extracting plugin archive');

    await extractArchive(settings);

    logger.log('Extraction complete');
  } catch (err) {
    logger.error(err);
    throw new Error('Error extracting plugin archive');
  }
};
