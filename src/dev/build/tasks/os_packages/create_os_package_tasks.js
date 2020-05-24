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

import { runFpm } from './run_fpm';
import { runDockerGenerator, runDockerGeneratorForUBI } from './docker_generator';

export const CreateDebPackageTask = {
  description: 'Creating deb package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'deb', [
      '--architecture',
      'amd64',
      '--deb-priority',
      'optional',
    ]);
  },
};

export const CreateRpmPackageTask = {
  description: 'Creating rpm package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'rpm', ['--architecture', 'x86_64', '--rpm-os', 'linux']);
  },
};

export const CreateDockerPackageTask = {
  description: 'Creating docker package',

  async run(config, log, build) {
    // Builds Docker targets for default and oss
    await runDockerGenerator(config, log, build);
  },
};

export const CreateDockerUbiPackageTask = {
  description: 'Creating docker ubi package',

  async run(config, log, build) {
    // Builds Docker target default with ubi7 base image
    await runDockerGeneratorForUBI(config, log, build);
  },
};
