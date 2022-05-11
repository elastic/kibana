/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Task, exec } from '../lib';

const YARN_EXEC = process.env.npm_execpath || 'yarn';

export const InstallDependencies: Task = {
  description: 'Installing node_modules, including production builds of packages',

  async run(config, log, build) {
    await exec(
      log,
      YARN_EXEC,
      [
        'install',
        '--non-interactive',
        '--production',
        '--ignore-optional',
        '--pure-lockfile',
        '--prefer-offline',

        // We're using --no-bin-links to support systems that don't have symlinks.
        // This is commonly seen in shared folders on virtual machines
        '--no-bin-links',
      ],
      {
        cwd: build.resolvePath(),
        env: {
          SASS_BINARY_SITE:
            'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-sass',
          RE2_DOWNLOAD_MIRROR:
            'https://us-central1-elastic-kibana-184716.cloudfunctions.net/kibana-ci-proxy-cache/node-re2',
        },
      }
    );
  },
};
