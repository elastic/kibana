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
const { readFileSync } = require('fs');
const { execSync } = require('child_process');
const merge = require('lodash.merge');
const { name, version, build } = require('../package.json');

function gitRev() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

function devConfig() {
  try {
    const apmDevConfigPath = join(__dirname, '..', 'config', 'apm.dev.js');
    return require(apmDevConfigPath); // eslint-disable-line import/no-dynamic-require
  } catch (e) {
    return {};
  }
}

const apmConfig = merge(
  {
    active: false,
    serverUrl: 'https://f1542b814f674090afd914960583265f.apm.us-central1.gcp.cloud.es.io:443',
    // The secretToken below is intended to be hardcoded in this file even though
    // it makes it public. This is not a security/privacy issue. Normally we'd
    // instead disable the need for a secretToken in the APM Server config where
    // the data is transmitted to, but due to how it's being hosted, it's easier,
    // for now, to simply leave it in.
    secretToken: 'R0Gjg46pE9K9wGestd',
    globalLabels: {},
    breakdownMetrics: true,
    centralConfig: false,
    logUncaughtExceptions: true,
  },
  devConfig()
);

try {
  const filename = join(__dirname, '..', 'data', 'uuid');
  apmConfig.globalLabels.kibana_uuid = readFileSync(filename, 'utf-8');
} catch (e) {} // eslint-disable-line no-empty

const rev = gitRev();
if (rev !== null) apmConfig.globalLabels.git_rev = rev;

function getConfig(serviceName) {
  return {
    ...apmConfig,
    ...{
      serviceName: `${serviceName}-${version.replace(/\./g, '_')}`,
    },
  };
}

/**
 * Flag to disable APM RUM support on all kibana builds by default
 */
const isKibanaDistributable = Boolean(build && build.distributable === true);

module.exports = function(serviceName = name) {
  if (process.env.kbnWorkerType === 'optmzr') return;

  const conf = getConfig(serviceName);

  require('elastic-apm-node').start(conf);
};

module.exports.getConfig = getConfig;
module.exports.isKibanaDistributable = isKibanaDistributable;
