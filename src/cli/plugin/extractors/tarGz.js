const zlib = require('zlib');
const Promise = require('bluebird');
const fs = require('fs');
const tar = require('tar');

module.exports = function (settings, logger) {
  return new Promise(function (resolve, reject) {
    const gunzip = zlib.createGunzip();
    const tarExtract = new tar.Extract({ path: settings.workingPath, strip: 1 });

    logger.log('Extracting plugin archive');

    fs.createReadStream(settings.tempArchiveFile)
    .pipe(gunzip)
    .on('error', handleError)
    .pipe(tarExtract)
    .on('error', handleError)
    .on('end', handleEnd);

    function handleError(err) {
      logger.error(err);
      return reject(new Error('Error extracting plugin archive'));
    }

    function handleEnd() {
      logger.log('Extraction complete');
      return resolve();
    }
  });
};
