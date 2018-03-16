const fetch = require('node-fetch');
const fs = require('fs');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const path = require('path');
const { BASE_PATH, DL_PATH } = require('../paths');
const { installArchive } = require('./archive');
const { log, cache } = require('../utils');

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

  await downloadFile(url, dest);
  return await installArchive(dest, { installPath, basePath });
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
  const cacheMeta = cache.readMeta(dest);

  if (!fs.existsSync(DL_PATH)) {
    mkdirp(DL_PATH);
  }

  if (!fs.existsSync(path.dirname(dest))) {
    mkdirp(path.dirname(dest));
  }

  log.info('downloading from %s', chalk.bold(url));

  return fetch(url, { headers: { 'If-None-Match': cacheMeta.etag } }).then(
    res =>
      new Promise((resolve, reject) => {
        if (res.status === 304) {
          log.info(
            'etags match, using cache from %s',
            chalk.bold(cacheMeta.ts)
          );
          return resolve();
        }

        if (!res.ok) {
          return reject(new Error(res.statusText));
        }

        const stream = fs.createWriteStream(downloadPath);
        res.body
          .pipe(stream)
          .on('error', error => {
            reject(error);
          })
          .on('finish', () => {
            if (res.ok) {
              const etag = res.headers.get('etag');

              fs.renameSync(downloadPath, dest);
              cache.writeMeta(dest, { etag });
              resolve();
            } else {
              reject(new Error(res.statusText));
            }
          });
      })
  );
}
