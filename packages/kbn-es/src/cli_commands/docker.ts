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
  parseTimeoutToMs,
  DEFAULT_DOCKER_CMD,
  DOCKER_IMG,
  DOCKER_REPO,
  DOCKER_TAG,
} from '../utils';
import { Command } from './types';

export const docker: Command = {
  description: 'Run an Elasticsearch Docker image',
  usage: 'es docker [<args>]',
  help: (defaults: Record<string, any> = {}) => {
    const { version, password } = defaults;

    // TODO: enrollment token + env params?
    // TODO: private registry?
    // TODO: docker-compose
    // TODO: check docker installed
    // TODO: get image name by version number? snapshot or release?
    // TODO: add serverless flag
    // TODO: parse docker logs
    // TODO: tests
    // TODO: docs?
    // TODO: validate img
    // TODO: network?
    // TODO: restart last container?
    // TODO: data archive
    return dedent`
    Options:

      --tag               Image tag of ES to run from ${DOCKER_REPO} [default: ${DOCKER_TAG}]
      --image             Full path to image of ES to run, has precedence over tag. [default: ${DOCKER_IMG}].
      --password          Sets password for elastic user [default: ${password}]
      --password.[user]   Sets password for native realm user [default: ${password}]
      -E                  Additional key=value settings to pass to Elasticsearch 
      -D                  Single quoted command to pass to Docker [default: ${DEFAULT_DOCKER_CMD}]
      --ssl               Sets up SSL on Elasticsearch
      --skip-ready-check  Disable the ready check
      --ready-timeout     Customize the ready check timeout, in seconds or "Xm" format, defaults to 1m

    Examples:

      es docker --tag master-SNAPSHOT-amd64
      es docker --image local/repo:tag
      es docker -D 'start 4e79be040f6aca5c433f73faa60fe245791482c2a1abda9417a505ec552cb9a5' 
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
        skipReadyCheck: 'skip-ready-check',
        readyTimeout: 'ready-timeout',
      },

      string: ['version', 'ready-timeout', 'D'],
      boolean: ['skip-ready-check'],

      default: defaults,
    });

    const pullStartTime = Date.now();
    reportTime(pullStartTime, 'pulled', {
      success: true,
      ...options,
    });

    const cluster = new Cluster({ ssl: options.ssl });
    await cluster.runDocker({
      reportTime,
      startTime: runStartTime,
      ...options,
      readyTimeout: parseTimeoutToMs(options.readyTimeout),
    });
  },
};
