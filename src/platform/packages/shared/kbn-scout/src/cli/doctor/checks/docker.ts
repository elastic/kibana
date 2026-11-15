/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import chalk from 'chalk';
import execa from 'execa';
import {
  ES_SERVERLESS_DEFAULT_IMAGE,
  SERVERLESS_NODES,
  formatBytes,
  getUiamContainers,
} from '@kbn/es';
import type { DoctorCheck, Fix } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge, getScoutServerPids, tryExec } from '../utils';

const RECOMMENDED_CPUS = 12;
const RECOMMENDED_MEMORY_GB = 15;
const RECOMMENDED_MEMORY = RECOMMENDED_MEMORY_GB * 1024 ** 3;
const DOCKER_START_TIMEOUT_MS = 120_000;

const waitForDocker = async () => {
  const deadline = Date.now() + DOCKER_START_TIMEOUT_MS;
  while (!(await tryExec('docker', ['info']))) {
    if (Date.now() > deadline) {
      throw new Error(`Docker did not start within ${DOCKER_START_TIMEOUT_MS / 1000}s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
};

const startDockerFix = (): Fix => {
  const command = process.platform === 'darwin' ? 'open -a Docker' : 'sudo systemctl start docker';

  return {
    command,
    run: async () => {
      await execa.command(command, { stdio: 'inherit' });
      await waitForDocker();
    },
  };
};

const dockerDaemonCheck: DoctorCheck = {
  title: 'Docker daemon',
  arch: 'serverless',
  run: async () => {
    const output = await tryExec('docker', ['info', '--format', '{{json .}}']);
    if (!output) {
      return fail('Docker is not running', { fix: startDockerFix() });
    }

    const { ServerVersion, MemTotal, NCPU } = JSON.parse(output);
    const details = `Docker ${ServerVersion} · ${NCPU} CPUs · ${formatBytes(MemTotal)} memory`;
    if (NCPU >= RECOMMENDED_CPUS && MemTotal >= RECOMMENDED_MEMORY) {
      return pass(details);
    }

    const recommended = `${RECOMMENDED_CPUS} CPUs and ${RECOMMENDED_MEMORY_GB} GB RAM`;
    return warn(
      `${details}, ${chalk.yellow(`multi-project serverless tests need ${recommended}`)}`,
      { hint: 'raise them in Docker Desktop settings → Resources' }
    );
  },
};

export const dockerChecks: DoctorCheck[] = [
  dockerDaemonCheck,
  {
    title: 'Elasticsearch serverless image',
    arch: 'serverless',
    dependsOn: dockerDaemonCheck,
    run: async () => {
      const output = await tryExec('docker', [
        'image',
        'inspect',
        ES_SERVERLESS_DEFAULT_IMAGE,
        '--format',
        '{{json .}}',
      ]);
      if (!output) {
        return warn(`${ES_SERVERLESS_DEFAULT_IMAGE} is not pulled yet`, {
          fix: { command: `docker pull ${ES_SERVERLESS_DEFAULT_IMAGE}` },
        });
      }

      const { Created, Size, Id } = JSON.parse(output);
      return pass(
        `${ES_SERVERLESS_DEFAULT_IMAGE} built ${formatAge(new Date(Created))} · ${formatBytes(
          Size
        )} · ${Id.slice(7, 19)}`
      );
    },
  },
  {
    title: 'Leftover serverless containers',
    arch: 'serverless',
    dependsOn: dockerDaemonCheck,
    run: async () => {
      const names = [...SERVERLESS_NODES, ...getUiamContainers({ includeOAuth: true })].map(
        ({ name }) => name
      );
      const running = ((await tryExec('docker', ['ps', '--format', '{{.Names}}'])) ?? '')
        .split('\n')
        .filter((name) => names.includes(name));

      const scoutServerPids = running.length ? await getScoutServerPids() : [];
      if (scoutServerPids.length) {
        return pass(
          `Serverless containers belong to running Scout servers (PID ${scoutServerPids.join(
            ', '
          )})`
        );
      }
      return running.length
        ? warn(`Serverless containers are still running: ${running.join(', ')}`, {
            fix: { command: `docker kill ${running.join(' ')}`, destructive: true },
          })
        : pass('No serverless containers running');
    },
  },
];
