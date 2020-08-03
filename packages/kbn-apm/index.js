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

const os = require('os');
const { resolve } = require('path');
const { readFileSync } = require('fs');
const { execSync } = require('child_process');

const Agent = require('elastic-apm-node');
const { REPO_ROOT, readKibanaPackageJSON } = require('@kbn/utils');

const { version, build } = readKibanaPackageJSON();

function gitRev() {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (e) {
    return null;
  }
}

const config = {
  secretToken: 'VCRNqoV777Vs3mJ1VF',
  serverUrl: 'https://b60e8f2199cf4713b3a11b3fce770101.apm.us-west1.gcp.cloud.es.io:443',
  environment: process.env.ELASTIC_APM_ENVIRONMENT,
  serviceName: 'kibana',
  serviceVersion: version,
  globalLabels: {
    os_kernel: os.release(),
    system_cpu_cores: os.cpus().length,
    system_cpu_name: os.cpus()[0].model,
    system_cpu_speed: os.cpus()[0].speed,
  },
  centralConfig: false,
  logUncaughtExceptions: true,
  active: process.env.ELASTIC_APM_ACTIVE || 'false',
};

function active() {
  return config.active;
}

try {
  const filename = resolve(REPO_ROOT, 'data', 'uuid');
  config.globalLabels.kibana_uuid = readFileSync(filename, 'utf-8');
} catch (e) {} // eslint-disable-line no-empty

const rev = gitRev();
if (rev !== null) config.globalLabels.git_rev = rev;

module.exports.config = config;

module.exports.isKibanaDistributable = Boolean(build && build.distributable === true);

module.exports.active = active;

module.exports.start = function start(options = {}) {
  if (process.env.kbnWorkerType === 'optmzr') return;

  Agent.start({ ...config, ...options });
  return Agent;
};

module.exports.flush = function flush() {
  return new Promise((resolve) => {
    active() ? Agent.flush(resolve) : resolve();
  });
};

module.exports.Agent = Agent;
