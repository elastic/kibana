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

const resolve = require('path').resolve;
const statSync = require('fs').statSync;

module.exports = function(plugin) {
  if (
    fileExists(resolve(plugin.root, '../kibana/package.json')) &&
    !fileExists(resolve(plugin.root, '../../kibana/package.json'))
  ) {
    process.stdout.write(
      '\nWARNING: Kibana now requires that plugins must be located in ' +
        '`../kibana-extra/{pluginName}` relative to the Kibana folder ' +
        'during development. We found a Kibana in `../kibana`, but not in ' +
        '`../../kibana`.\n'
    );
  }
};

function fileExists(path) {
  try {
    const stat = statSync(path);
    return stat.isFile();
  } catch (e) {
    return false;
  }
}
