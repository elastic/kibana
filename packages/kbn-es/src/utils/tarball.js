const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const tarFs = require('tar-fs');

/**
 * @param {String} archive
 * @param {String} dirPath
 */
exports.extractTarball = function extractTarball(archive, dirPath) {
  const stripOne = header => {
    header.name = header.name
      .split(/\/|\\/)
      .slice(1)
      .join(path.sep);
    return header;
  };

  return new Promise((resolve, reject) => {
    fs
      .createReadStream(archive)
      .on('error', reject)
      .pipe(zlib.createGunzip())
      .on('error', reject)
      .pipe(tarFs.extract(dirPath, { map: stripOne }))
      .on('error', reject)
      .on('finish', resolve);
  });
};
