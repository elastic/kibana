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

exports.readMeta = function readMeta(file) {
  try {
    const meta = fs.readFileSync(`${file}.meta`, {
      encoding: 'utf8',
    });

    return {
      exists: fs.existsSync(file),
      ...JSON.parse(meta),
    };
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    return {
      exists: false,
    };
  }
};

exports.writeMeta = function readMeta(file, details = {}) {
  const meta = {
    ts: new Date(),
    ...details,
  };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.meta`, JSON.stringify(meta, null, 2));
};
