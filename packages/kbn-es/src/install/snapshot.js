const fetch = require('node-fetch');
const fs = require('fs');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const path = require('path');
const { BASE_PATH, DL_PATH } = require('../paths');
const { installArchive } = require('./archive');
const { log } = require('../utils');

/**
 * @param {Object} options
 * @property {String} options.version
 * @property {String} options.basePath
 * @property {String} options.installPath
 */
exports.installSnapshot = async function installSnapshot({
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
}) {
  const fileName = `elasticsearch-${version}-SNAPSHOT.tar.gz`;
  const url = `https://snapshots.elastic.co/downloads/elasticsearch/${fileName}`;
  const dest = path.resolve(basePath, 'cache', fileName);

  log.info('version: %s', chalk.bold(version));
  log.info('install path: %s', chalk.bold(installPath));

  const hoursOld = fileAgeInHours(dest);
  if (hoursOld && hoursOld < 12) {
    log.info(
      'using cache from %s hours ago',
      chalk.bold(hoursOld.toPrecision(2))
    );
  } else {
    log.info('downloading %s', chalk.bold(url));
    await downloadFile(url, dest);
  }

  await installArchive(dest, { installPath, basePath });

  return { installPath };
};

/**
 * Downloads to tmp and moves once complete
 *
 * @param {String} url
 * @param {String} dest
 * @returns {Promose}
 */
function downloadFile(url, dest) {
  const downloadPath = path.resolve(DL_PATH, path.basename(dest));

  if (!fs.existsSync(DL_PATH)) {
    mkdirp(DL_PATH);
  }

  if (!fs.existsSync(path.dirname(dest))) {
    mkdirp(path.dirname(dest));
  }

  return fetch(url).then(
    res =>
      new Promise((resolve, reject) => {
        if (!res.ok) {
          reject(new Error(res.statusText));
        }

        const stream = fs.createWriteStream(downloadPath);
        res.body
          .pipe(stream)
          .on('error', error => {
            reject(error);
          })
          .on('finish', () => {
            if (res.ok) {
              fs.renameSync(downloadPath, dest);
              resolve();
            } else {
              reject(new Error(res.statusText));
            }
          });
      })
  );
}

/**
 * Determines the age of a file
 *
 * @param {String} path - path to file
 */
function fileAgeInHours(path) {
  try {
    const cache = fs.statSync(path);
    return (Date.now() - Date.parse(cache.ctime)) * 2.77778e-7;
  } catch (e) {
    return;
  }
}
