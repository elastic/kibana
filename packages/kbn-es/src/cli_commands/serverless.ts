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
import {
  SERVERLESS_REPO,
  SERVERLESS_TAG,
  SERVERLESS_IMG,
  DEFAULT_PORT,
  ServerlessOptions,
} from '../utils';
import { Command } from './types';

export const serverless: Command = {
  description: 'Run Serverless Elasticsearch through Docker',
  usage: 'es serverless [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    return dedent`
    Options:

      --tag               Image tag of ESS to run from ${SERVERLESS_REPO} [default: ${SERVERLESS_TAG}]
      --image             Full path of ESS image to run, has precedence over tag. [default: ${SERVERLESS_IMG}]
      
      --background        Start ESS without attaching to the first node's logs
      --basePath          Path to the directory where the ES cluster will store data
      --clean             Remove existing file system object store before running
      --kill              Kill running ESS nodes if detected on startup
      --port              The port to bind to on 127.0.0.1 [default: ${DEFAULT_PORT}]
      --ssl               Enable HTTP SSL on Elasticsearch
      --skipTeardown      If this process exits, leave the ES cluster running in the background
      --waitForReady      Wait for the ES cluster to be ready to serve requests
      
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

      string: ['tag', 'image', 'basePath'],
      boolean: ['clean', 'ssl', 'kill', 'background', 'skipTeardown', 'waitForReady'],

      default: defaults,
    }) as unknown as ServerlessOptions;

    /*
     * The nodes will be killed immediately if background = true and skipTeardown = false
     * because the CLI process exits after starting the nodes. We handle this here instead of
     * in runServerless because in FTR we run the nodes in the background but the parent
     * process continues for testing and we want to be able to SIGINT for teardown.
     */
    if (options.background && !options.skipTeardown) {
      options.skipTeardown = true;
    }

    const cluster = new Cluster();
    await cluster.runServerless({
      reportTime,
      startTime: runStartTime,
      ...options,
    });
  },
};
