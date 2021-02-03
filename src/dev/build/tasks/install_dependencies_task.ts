/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Project } from '@kbn/pm';

import { Task } from '../lib';

export const InstallDependencies: Task = {
  description: 'Installing node_modules, including production builds of packages',

  async run(config, log, build) {
    const project = await Project.fromPath(build.resolvePath());

    await project.installDependencies({
      extraArgs: [
        '--production',
        '--ignore-optional',
        '--pure-lockfile',
        '--prefer-offline',

        // We're using --no-bin-links to support systems that don't have symlinks.
        // This is commonly seen in shared folders on virtual machines
        '--no-bin-links',
      ],
    });
  },
};
