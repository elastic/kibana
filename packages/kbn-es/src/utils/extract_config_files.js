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

const path = require('path');
const fs = require('fs');

/**
 * Copies config references to an absolute path to
 * the provided destination. This is necessary as ES security
 * requires files to be within the installation directory
 *
 * @param {Array} config
 * @param {String} dest
 */
exports.extractConfigFiles = function extractConfigFiles(config, dest, options = {}) {
  const originalConfig = typeof config === 'string' ? [config] : config;
  const localConfig = [];

  originalConfig.forEach((prop) => {
    const [key, value] = prop.split('=');

    if (isFile(value)) {
      const filename = path.basename(value);
      const destPath = path.resolve(dest, 'config', filename);
      copyFileSync(value, destPath);

      if (options.log) {
        options.log.info('moved %s in config to %s', value, destPath);
      }

      localConfig.push(`${key}=${filename}`);
    } else {
      localConfig.push(prop);
    }
  });

  return localConfig;
};

function isFile(dest = '') {
  return path.isAbsolute(dest) && path.extname(dest).length > 0 && fs.existsSync(dest);
}

function copyFileSync(src, dest) {
  const destPath = path.dirname(dest);

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  fs.writeFileSync(dest, fs.readFileSync(src));
}
