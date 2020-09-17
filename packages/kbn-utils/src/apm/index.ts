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

import os from 'os';
import path from 'path';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

import Agent from 'elastic-apm-node';

import { kibanaPackageJSON } from '../package_json';
import { getDataPath } from '../path';

function gitRev(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch (e) {
    return '';
  }
}

function isActive(): boolean {
  if (process.env.kbnWorkerType === 'optmzr') {
    return false;
  }

  return Boolean(process.env.ELASTIC_APM_ACTIVE || false);
}

function readUUID(): string {
  try {
    const filename = path.resolve(getDataPath(), 'uuid');
    return readFileSync(filename, 'utf-8');
  } catch (e) {
    return '';
  }
}

export const config = {
  secretToken: 'VCRNqoV777Vs3mJ1VF',
  serverUrl: 'https://b60e8f2199cf4713b3a11b3fce770101.apm.us-west1.gcp.cloud.es.io:443',
  environment: process.env.ELASTIC_APM_ENVIRONMENT || 'development',
  serviceName: 'kibana',
  serviceVersion: kibanaPackageJSON.version,
  globalLabels: {
    os_kernel: os.release(),
    system_cpu_cores: os.cpus().length,
    system_cpu_name: os.cpus()[0].model,
    system_cpu_speed: os.cpus()[0].speed,
    kibana_uuid: readUUID(),
    git_rev: gitRev(),
  },
  centralConfig: false,
  logUncaughtExceptions: true,
  active: isActive(),
};

export function start(options = {}): typeof Agent | undefined {
  if (process.env.kbnWorkerType === 'optmzr') return;

  Agent.start({ ...config, ...options });
  return Agent;
}

export function flush(): Promise<undefined> {
  return new Promise((resolve) => {
    if (!isActive()) return resolve();
    Agent.flush(resolve);
  });
}

export { Agent };
