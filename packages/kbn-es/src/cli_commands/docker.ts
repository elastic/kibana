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
// docker run --name es-node01 --net elastic -p 9200:9200 -p 9300:9300 -t docker.elastic.co/elasticsearch/elasticsearch:8.8.1

export const docker = {
  description: 'Run an Elasticsearch Docker image',
  usage: 'es docker [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    const { version, password = 'changeme' } = defaults;

    // TODO: show default docker params
    // TODO: expand examples
    return dedent`
    Options:

      --version           Version of ES to run [default: ${version}]
      --image             Image of ES to run [default: docker.elastic.co/elasticsearch/elasticsearch:${version}]
      --password          Sets password for elastic user [default: ${password}]
      --password.[user]   Sets password for native realm user [default: ${password}]
      -E                  Additional key=value settings to pass to Elasticsearch
      -D                  Additional key=value settings to pass to Docker
      --ssl               Sets up SSL on Elasticsearch
      --skip-ready-check  Disable the ready check
      --ready-timeout     Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m

    Example:

      es docker --version ${version}
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

    // TODO: check docker installed
    // TODO: allow docker run (pull + start) or start (existing container)
    // TODO: enrollment token + env params?
    const cluster = new Cluster({ ssl: false });
    await cluster.run('', { isDocker: true });

    // reportTime(installStartTime, 'pulled', {
    //   success: true,
    //   ...options,
    // });
  },
};
