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

const execFileSync = require('child_process').execFileSync;
const { join } = require('path');
const split = require('argv-split');

module.exports = function(plugin, run, options) {
  options = options || {};

  const cmd = 'node';
  const script = join('scripts', 'kibana.js');
  const nodeOptions = split(process.env.NODE_OPTIONS || '');

  let args = nodeOptions.concat([script, '--dev', '--plugin-path', plugin.root]);

  if (Array.isArray(plugin.includePlugins)) {
    plugin.includePlugins.forEach(path => {
      args = args.concat(['--plugin-path', path]);
    });
  }

  if (options.flags) {
    args = args.concat(options.flags);
  }

  execFileSync(cmd, args, {
    cwd: plugin.kibanaRoot,
    stdio: ['ignore', 1, 2],
  });
};
