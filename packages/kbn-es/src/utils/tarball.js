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
