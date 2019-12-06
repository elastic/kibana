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

const { existsSync } = require('fs');
const { join } = require('path');
const { name, version, build } = require('../package.json');

/**
 * flag to disable APM support on all kibana builds by default
 */
const isKibanaDistributable = Boolean(build && build.distributable === true);

function getConfig(serviceName) {
  const config = {
    serviceName: `${serviceName}-${version.replace(/\./g, '_')}`,
  };

  const configPath = join(__dirname, '..', 'config', 'apm.js');
  if (existsSync(configPath)) {
    const configFile = require(configPath); // eslint-disable-line import/no-dynamic-require
    Object.assign(config, configFile);
  } else {
    config.active = false;
  }
  return config;
}

module.exports = function(serviceName = name) {
  if (process.env.kbnWorkerType === 'optmzr') return;

  const conf = getConfig(serviceName);

  require('elastic-apm-node').start(conf);
};

module.exports.getConfig = getConfig;
module.exports.isKibanaDistributable = isKibanaDistributable;
