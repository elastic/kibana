/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { Cluster } from '../cluster';

export const docker = {
  description: 'Pull and run an Elasticsearch Docker image',
  // TODO: update to correct params
  usage: 'es docker <path> [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    const { version } = defaults;

    return dedent`
    Options:

      --version     Version of ES to pull [default: ${version}]

    Example:

      es docker --version 8.8.1
    `;
  },
  run: async (defaults = {}) => {
    const runStartTime = Date.now();
    const log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
    const reportTime = getTimeReporter(log, 'scripts/es docker');

    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        esArgs: 'E',
      },

      string: ['version', 'ready-timeout'],

      default: defaults,
    });

    // const cluster = new Cluster({ ssl: options.ssl });

    // reportTime(installStartTime, 'pulled', {
    //   success: true,
    //   ...options,
    // });
  },
};
