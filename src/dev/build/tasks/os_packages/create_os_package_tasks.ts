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

import { Task } from '../../lib';
import { runFpm } from './run_fpm';
import { runDockerGenerator } from './docker_generator';

export const CreateDebPackage: Task = {
  description: 'Creating deb package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'deb', 'x64', [
      '--architecture',
      'amd64',
      '--deb-priority',
      'optional',
    ]);

    await runFpm(config, log, build, 'deb', 'arm64', [
      '--architecture',
      'arm64',
      '--deb-priority',
      'optional',
    ]);
  },
};

export const CreateRpmPackage: Task = {
  description: 'Creating rpm package',

  async run(config, log, build) {
    await runFpm(config, log, build, 'rpm', 'x64', [
      '--architecture',
      'x86_64',
      '--rpm-os',
      'linux',
    ]);
    await runFpm(config, log, build, 'rpm', 'arm64', [
      '--architecture',
      'aarch64',
      '--rpm-os',
      'linux',
    ]);
  },
};

export const CreateDockerCentOS: Task = {
  description: 'Creating Docker CentOS image',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      ubi: false,
      context: false,
      architecture: 'x64',
      image: true,
    });
    await runDockerGenerator(config, log, build, {
      ubi: false,
      context: false,
      architecture: 'aarch64',
      image: true,
    });
  },
};

export const CreateDockerUBI: Task = {
  description: 'Creating Docker UBI image',

  async run(config, log, build) {
    if (!build.isOss()) {
      await runDockerGenerator(config, log, build, {
        ubi: true,
        context: false,
        architecture: 'x64',
        image: true,
      });
    }
  },
};

export const CreateDockerContexts: Task = {
  description: 'Creating Docker build contexts',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      ubi: false,
      context: true,
      architecture: 'x64',
      image: false,
    });
    await runDockerGenerator(config, log, build, {
      ubi: false,
      context: true,
      architecture: 'aarch64',
      image: false,
    });

    if (build.isOss()) {
      await runDockerGenerator(config, log, build, {
        ubi: true,
        context: true,
        architecture: 'x64',
        image: false,
      });
    }
  },
};
