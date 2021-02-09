/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
      architecture: 'x64',
      context: false,
      image: true,
    });
    await runDockerGenerator(config, log, build, {
      architecture: 'aarch64',
      context: false,
      image: true,
    });
  },
};

export const CreateDockerUBI: Task = {
  description: 'Creating Docker UBI image',

  async run(config, log, build) {
    if (!build.isOss()) {
      await runDockerGenerator(config, log, build, {
        architecture: 'x64',
        context: false,
        ubi: true,
        image: true,
      });
    }
  },
};

export const CreateDockerContexts: Task = {
  description: 'Creating Docker build contexts',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      context: true,
      image: false,
    });

    if (!build.isOss()) {
      await runDockerGenerator(config, log, build, {
        ubi: true,
        context: true,
        image: false,
      });
      await runDockerGenerator(config, log, build, {
        ironbank: true,
        context: true,
        image: false,
      });
    }
  },
};
