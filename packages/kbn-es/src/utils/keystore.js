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

const execa = require('execa');
const { format } = require('util');

const { ES_KEYSTORE_BIN } = require('../paths');

exports.createKeystore = function(installPath) {
  const proc = execa(ES_KEYSTORE_BIN, ['create'], {
    cwd: installPath,
    input: 'n',
  });

  return new Promise((resolve, reject) => {
    proc.stdout.on('data', data => {
      data.toString().match(/already exists/)
        ? reject('an Elasticsearch Keystore already exists')
        : resolve();
    });
  });
};

exports.keystoreAdd = function(installPath, key, value) {
  const proc = execa(ES_KEYSTORE_BIN, ['add', key, '-x'], {
    input: value,
    cwd: installPath,
  });

  return new Promise((resolve, reject) => {
    proc.stdout.once('data', data => {
      data.toString().match(/already exists/)
        ? reject(format('%s already exists', key))
        : resolve();
    });

    // on success, no data is sent
    proc.once('exit', resolve);
  });
};
