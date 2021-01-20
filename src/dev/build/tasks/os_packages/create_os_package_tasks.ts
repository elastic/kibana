/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Task } from '../../lib';
import { runFpm } from './run_fpm';
import { runDockerGenerator, runDockerGeneratorForUBI } from './docker_generator';

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

export const CreateDockerPackage: Task = {
  description: 'Creating docker package',

  async run(config, log, build) {
    // Builds Docker targets for default and oss
    await runDockerGenerator(config, log, build);
  },
};

export const CreateDockerUbiPackage: Task = {
  description: 'Creating docker ubi package',

  async run(config, log, build) {
    // Builds Docker target default with ubi7 base image
    await runDockerGeneratorForUBI(config, log, build);
  },
};
