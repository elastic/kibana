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
import { parseTimeoutToMs, DEFAULT_DOCKER_REGISTRY } from '../utils';
import { Command } from './types';

const DEFAULT_TAG = 'latest';
const DEFAULT_IMG = `${DEFAULT_DOCKER_REGISTRY}/elasticsearch-ci/elasticsearch-serverless:${DEFAULT_TAG}`;

export const serverless: Command = {
  description: 'Run Serverless Elasticsearch through Docker',
  usage: 'es serverless [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    return dedent`
    Options:

      --tag               Image tag of ES Serverless to run from ${DEFAULT_DOCKER_REGISTRY} [default: ${DEFAULT_TAG}]
      --image             Full path of ES Serverless image to run [default: ${DEFAULT_IMG}]. Has precedence over tag.
      --clean             Remove existing file system object store before running
      -E                  Additional key=value settings to pass to Elasticsearch

    Examples:

      es serverless --tag git-fec36430fba2-x86_64
      es serverless --image local/repo:tag
    `;
  },
  run: async (defaults = {}) => {
    const runStartTime = Date.now();
    const log = new ToolingLog({
      level: 'info',
      writeTo: process.stdout,
    });
    const reportTime = getTimeReporter(log, 'scripts/es serverless');

    const argv = process.argv.slice(2);
    const options = getopts(argv, {
      alias: {
        esArgs: 'E',
      },

      string: ['tag', 'image'],
      boolean: ['clean'],

      default: defaults,
    });

    // const pullStartTime = Date.now();
    // reportTime(pullStartTime, 'pulled', {
    //   success: true,
    //   ...options,
    // });

    const cluster = new Cluster({ ssl: options.ssl });
    await cluster.runServerless({
      reportTime,
      startTime: runStartTime,
      ...options,
      readyTimeout: parseTimeoutToMs(options.readyTimeout),
    });
  },
};
