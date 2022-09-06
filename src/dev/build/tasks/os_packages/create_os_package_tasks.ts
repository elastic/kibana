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
import { createOSPackageKibanaYML } from './create_os_package_kibana_yml';

export const CreatePackageConfig: Task = {
  description: 'Creating OS package kibana.yml',

  async run(config, log, build) {
    await createOSPackageKibanaYML(config, build);
  },
};

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

const dockerBuildDate = new Date().toISOString();
export const CreateDockerUbuntu: Task = {
  description: 'Creating Docker Ubuntu image',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      architecture: 'x64',
      baseImage: 'ubuntu',
      context: false,
      image: true,
      dockerBuildDate,
    });
    await runDockerGenerator(config, log, build, {
      architecture: 'aarch64',
      baseImage: 'ubuntu',
      context: false,
      image: true,
      dockerBuildDate,
    });
  },
};

export const CreateDockerUBI: Task = {
  description: 'Creating Docker UBI image',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      architecture: 'x64',
      baseImage: 'ubi',
      context: false,
      image: true,
    });
  },
};

export const CreateDockerCloud: Task = {
  description: 'Creating Docker Cloud image',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      architecture: 'x64',
      baseImage: 'ubuntu',
      context: false,
      cloud: true,
      image: true,
    });
    await runDockerGenerator(config, log, build, {
      architecture: 'aarch64',
      baseImage: 'ubuntu',
      context: false,
      cloud: true,
      image: true,
    });
  },
};

export const CreateDockerContexts: Task = {
  description: 'Creating Docker build contexts',

  async run(config, log, build) {
    await runDockerGenerator(config, log, build, {
      baseImage: 'ubuntu',
      context: true,
      image: false,
      dockerBuildDate,
    });

    await runDockerGenerator(config, log, build, {
      baseImage: 'ubi',
      context: true,
      image: false,
    });
    await runDockerGenerator(config, log, build, {
      ironbank: true,
      baseImage: 'none',
      context: true,
      image: false,
    });
    await runDockerGenerator(config, log, build, {
      baseImage: 'ubuntu',
      cloud: true,
      context: true,
      image: false,
    });
  },
};
