/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const mkdirp = require('mkdirp');
const chalk = require('chalk');
const cache = require('./cache');

/**
 * Downloads to tmp and moves once complete
 *
 * @param {String} url
 * @param {String} dest
 * @param {ToolingLog} log
 * @returns {Promise}
 */
exports.downloadFile = function downloadFile(url, dest, log) {
  const downloadPath = `${dest}.tmp`;
  const cacheMeta = cache.readMeta(dest);

  mkdirp.sync(path.dirname(dest));

  log.info('downloading from %s', chalk.bold(url));

  return fetch(url, { headers: { 'If-None-Match': cacheMeta.etag } }).then(
    res =>
      new Promise((resolve, reject) => {
        if (res.status === 304) {
          log.info('etags match, using cache from %s', chalk.bold(cacheMeta.ts));
          return resolve();
        }

        if (!res.ok) {
          return reject(new Error(`Unable to download elasticsearch snapshot: ${res.statusText}`));
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
};
