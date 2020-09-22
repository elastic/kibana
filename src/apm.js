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

const { join } = require('path');
const { name, build } = require('../package.json');
const { loadConfiguration } = require('@kbn/apm-config-loader');

const ROOT_DIR = join(__dirname, '..');
let apmConfig;

/**
 * Flag to disable APM RUM support on all kibana builds by default
 */
const isKibanaDistributable = Boolean(build && build.distributable === true);

module.exports = function (serviceName = name) {
  if (process.env.kbnWorkerType === 'optmzr') {
    return;
  }

  apmConfig = loadConfiguration(ROOT_DIR);
  const conf = apmConfig.getConfig(serviceName);
  require('elastic-apm-node').start(conf);
};

module.exports.getConfig = (serviceName) => {
  // integration test runner starts a kibana server that import the module without initializing APM.
  // so we need to check initialization of the config.
  // note that we can't just load the configuration during this module's import
  // because jest IT are ran with `--config path-to-jest-config.js` which conflicts with the CLI's `config` arg
  // causing the config loader to try to load the jest js config as yaml and throws.
  if (apmConfig) {
    return apmConfig.getConfig(serviceName);
  }
  return {};
};
module.exports.isKibanaDistributable = isKibanaDistributable;
