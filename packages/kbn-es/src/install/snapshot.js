const fetch = require('node-fetch');
const fs = require('fs');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const path = require('path');
const { BASE_PATH } = require('../paths');
const { installArchive } = require('./archive');
const { log: defaultLog, cache } = require('../utils');

/**
 * @param {Object} options
 * @property {String} options.version
 * @property {String} options.basePath
 * @property {String} options.installPath
 * @property {ToolingLog} options.log
 */
exports.installSnapshot = async function installSnapshot({
  version,
  basePath = BASE_PATH,
  installPath = path.resolve(basePath, version),
  log = defaultLog,
}) {
  const fileName = `elasticsearch-${version}-SNAPSHOT.tar.gz`;
  const url = `https://snapshots.elastic.co/downloads/elasticsearch/${fileName}`;
  const dest = path.resolve(basePath, 'cache', fileName);

  log.info('version: %s', chalk.bold(version));
  log.info('install path: %s', chalk.bold(installPath));

  await downloadFile(url, dest, log);
  return await installArchive(dest, { installPath, basePath, log });
};

/**
 * Downloads to tmp and moves once complete
 *
 * @param {String} url
 * @param {String} dest
 * @param {ToolingLog} log
 * @returns {Promose}
 */
function downloadFile(url, dest, log) {
  const downloadPath = `${dest}.tmp`;
  const cacheMeta = cache.readMeta(dest);

  mkdirp.sync(path.dirname(dest));

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

              cache.writeMeta(dest, { etag });
              fs.renameSync(downloadPath, dest);
              resolve();
            } else {
              reject(new Error(res.statusText));
            }
          });
      })
  );
}
