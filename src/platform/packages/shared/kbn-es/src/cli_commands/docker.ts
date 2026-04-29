/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import dedent from 'dedent';
import getopts from 'getopts';
import { ToolingLog } from '@kbn/tooling-log';
import { getTimeReporter } from '@kbn/ci-stats-reporter';

import { Cluster } from '../cluster';
import { DOCKER_IMG, DOCKER_REPO, DOCKER_TAG, DEFAULT_PORT } from '../utils';
import { parseTimeoutToMs } from '../utils';
import type { Command } from './types';

export const docker: Command = {
  description: 'Run an Elasticsearch Docker image',
  usage: 'es docker [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    const { password } = defaults;

    return dedent`
    Options:

      --tag               Image tag of ES to run from ${DOCKER_REPO} [default: ${DOCKER_TAG}]
      --image             Full path to image of ES to run, has precedence over tag. [default: ${DOCKER_IMG}]
      --password          Sets password for elastic user [default: ${password}]
      --port              The port to bind to on 127.0.0.1 [default: ${DEFAULT_PORT}]
      --ssl               Sets up HTTP and Transport SSL and enables security plugin on Elasticsearch
      --kill              Kill running ES nodes if detected
      -E                  Additional key=value settings to pass to Elasticsearch
      -D                  Override Docker command
      -F                  Absolute paths for files to mount into container

      Snapshot mode (--snapshot):

      --snapshot          Activate snapshot-equivalent behavior: security enabled, detached mode,
                          readiness check, native realm setup, and extra default ES args.
                          Without this flag, 'es docker' behaves exactly as before.
      --license           Run with a 'basic' or 'trial' license [default: basic] (snapshot mode)
      --version           Version of ES to run [default: <from package.json>] (snapshot mode)
      --background        Start detached and return after ES is ready (snapshot mode)
      --name              Container name for parallel runs [default: es01] (snapshot mode)
      --transport-port    Host-side transport port [default: port + 100] (snapshot mode)
      --skip-ready-check  Disable the readiness check (snapshot mode)
      --ready-timeout     Customize the ready check timeout, in seconds or "Xm" format [default: 1m]

    Examples:

      es docker --tag master-SNAPSHOT-amd64
      es docker --image docker.elastic.co/repo:tag
      es docker -D 'start es01'
      es docker --snapshot --license=trial -E path.data=../my-data
      es docker --snapshot --background --name es-test-1
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
        dockerCmd: 'D',
        files: 'F',
        skipReadyCheck: 'skip-ready-check',
        readyTimeout: 'ready-timeout',
        transportPort: 'transport-port',
      },

      string: ['tag', 'image', 'D', 'version', 'license', 'name', 'ready-timeout'],
      boolean: ['ssl', 'kill', 'snapshot', 'background', 'skip-ready-check'],

      default: defaults,
    });

    const cluster = new Cluster();
    await cluster.runDocker({
      reportTime,
      startTime: runStartTime,
      ...options,
      readyTimeout: parseTimeoutToMs(options.readyTimeout),
      transportPort: options.transportPort ? Number(options.transportPort) : undefined,
      port: options.port ? Number(options.port) : undefined,
    });
  },
};
