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

const { resolve } = require('path');

const { debug } = require('./debug');

const DEFAULT_PLUGIN_PATH = '../..';

/*
 * Resolves the path to Kibana, either from default setting or config
 */
exports.getKibanaPath = function (config, projectRoot) {
  const inConfig = config != null && config.kibanaPath;

  // We only allow `.` in the config as we need it for Kibana itself
  if (inConfig && config.kibanaPath !== '.') {
    throw new Error(
      'The `kibanaPath` option has been removed from `eslint-import-resolver-kibana`. ' +
        'During development your plugin must live in `./plugins/{pluginName}` ' +
        'inside the Kibana folder or `../kibana-extra/{pluginName}` ' +
        'relative to the Kibana folder to work with this package.'
    );
  }

  const kibanaPath = inConfig
    ? resolve(projectRoot, config.kibanaPath)
    : resolve(projectRoot, DEFAULT_PLUGIN_PATH);

  debug(`Resolved Kibana path: ${kibanaPath}`);
  return kibanaPath;
};
