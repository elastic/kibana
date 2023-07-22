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
import { DOCKER_IMG, DOCKER_REPO, DOCKER_TAG } from '../utils';
import { Command } from './types';

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
      -E                  Additional key=value settings to pass to Elasticsearch
      -D                  Override Docker command

    Examples:

      es docker --tag master-SNAPSHOT-amd64
      es docker --image docker.elastic.co/repo:tag
      es docker -D 'start es01' 
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
      },

      string: ['tag', 'image', 'D'],

      default: defaults,
    });

    const cluster = new Cluster();
    await cluster.runDocker({
      reportTime,
      startTime: runStartTime,
      ...options,
    });
  },
};
