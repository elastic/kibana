const Promise = require('bluebird');
const DecompressZip = require('@bigfunger/decompress-zip');

module.exports = function (settings, logger) {
  return new Promise(function (resolve, reject) {
    logger.log('Extracting plugin archive');

    const unzipper = new DecompressZip(settings.tempArchiveFile);

    unzipper.on('error', function (err) {
      logger.error(err);
      return reject(new Error('Error extracting plugin archive'));
    });

    unzipper.on('extract', function (log) {
      logger.log('Extraction complete');
      return resolve();
    });

    unzipper.extract({
      path: settings.workingPath,
      filter: function (file) {
        return file.type !== 'SymbolicLink';
      },
      strip: 1
    });
  });
};
