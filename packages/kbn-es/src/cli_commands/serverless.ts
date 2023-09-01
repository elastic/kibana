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

import { Cluster, type ServerlessOptions } from '../cluster';
import { SERVERLESS_REPO, SERVERLESS_TAG, SERVERLESS_IMG, DEFAULT_PORT } from '../utils';
import { Command } from './types';

export const serverless: Command = {
  description: 'Run Serverless Elasticsearch through Docker',
  usage: 'es serverless [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    return dedent`
    Options:

      --tag               Image tag of ESS to run from ${SERVERLESS_REPO} [default: ${SERVERLESS_TAG}]
      --image             Full path of ESS image to run, has precedence over tag. [default: ${SERVERLESS_IMG}]
      --clean             Remove existing file system object store before running
      --port              The port to bind to on 127.0.0.1 [default: ${DEFAULT_PORT}]
      --ssl               Sets up SSL and enables security plugin on Elasticsearch
      --kill              Kill running ESS nodes if detected
      --background        Start ESS without attaching to the first node's logs
      -E                  Additional key=value settings to pass to Elasticsearch
      -F                  Absolute paths for files to mount into containers

    Examples:

      es serverless --tag git-fec36430fba2-x86_64
      es serverless --image docker.elastic.co/repo:tag
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
        basePath: 'base-path',
        esArgs: 'E',
        files: 'F',
      },

      string: ['tag', 'image'],
      boolean: ['clean', 'ssl', 'kill', 'background'],

      default: defaults,
    }) as unknown as ServerlessOptions;

    const cluster = new Cluster();
    await cluster.runServerless({
      reportTime,
      startTime: runStartTime,
      ...options,
    });
  },
};
