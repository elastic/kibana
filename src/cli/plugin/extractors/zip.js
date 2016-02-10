import DecompressZip from '@bigfunger/decompress-zip';

async function extractArchive(settings) {
  await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(settings.tempArchiveFile);

    unzipper.on('error', reject);

    unzipper.extract({
      path: settings.workingPath,
      strip: 1,
      filter(file) {
        return file.type !== 'SymbolicLink';
      }
    });

    unzipper.on('extract', resolve);
  });
}

export default async function extractZip(settings, logger) {
  try {
    logger.log('Extracting plugin archive');

    await extractArchive(settings);

    logger.log('Extraction complete');
  } catch (err) {
    logger.error(err);
    throw new Error('Error extracting plugin archive');
  }
};
