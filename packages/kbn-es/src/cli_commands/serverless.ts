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

import { basename } from 'path';
import { SERVERLESS_RESOURCES_PATHS } from '../paths';
import { Cluster } from '../cluster';
import {
  ES_SERVERLESS_REPO_ELASTICSEARCH,
  ES_SERVERLESS_DEFAULT_IMAGE,
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

      --tag               Image tag of ES serverless to run from ${ES_SERVERLESS_REPO_ELASTICSEARCH}
      --image             Full path of ES serverless image to run, has precedence over tag. [default: ${ES_SERVERLESS_DEFAULT_IMAGE}]
      --background        Start ES serverless without attaching to the first node's logs
      --basePath          Path to the directory where the ES cluster will store data
      --clean             Remove existing file system object store before running
      --kill              Kill running ES serverless nodes if detected on startup
      --host              Publish ES docker container on additional host IP
      --port              The port to bind to on 127.0.0.1 [default: ${DEFAULT_PORT}]
      --ssl               Enable HTTP SSL on the ES cluster
      --skipTeardown      If this process exits, leave the ES cluster running in the background
      --waitForReady      Wait for the ES cluster to be ready to serve requests
      --resources         Overrides resources under ES 'config/' directory, which are by default
                          mounted from 'packages/kbn-es/src/serverless_resources/users'. Value should
                          be a valid file path (relative or absolute). This option can be used multiple
                          times if needing to override multiple files. The following files can be overwritten:
                          ${SERVERLESS_RESOURCES_PATHS.map((filePath) => basename(filePath)).join(
                            ' | '
                          )}

      -E                  Additional key=value settings to pass to ES
      -F                  Absolute paths for files to mount into containers

    Examples:

      es serverless --tag git-fec36430fba2-x86_64 # loads ${ES_SERVERLESS_REPO_ELASTICSEARCH}:git-fec36430fba2-x86_64
      es serverless --image docker.elastic.co/kibana-ci/elasticsearch-serverless:latest-verified
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

      string: ['tag', 'image', 'basePath', 'resources', 'host'],
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
