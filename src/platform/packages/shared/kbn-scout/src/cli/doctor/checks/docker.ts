/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { ES_SERVERLESS_DEFAULT_IMAGE, SERVERLESS_NODES, getUiamContainers } from '@kbn/es';
import type { DoctorCheckGroup, Fix } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge, formatBytes, tryExec } from '../utils';

const RECOMMENDED_MEMORY = 15 * 1024 ** 3;
const DOCKER_START_TIMEOUT_MS = 120_000;

const startDockerFix = (): Fix => {
  const command = process.platform === 'darwin' ? 'open -a Docker' : 'sudo systemctl start docker';

  return {
    command,
    run: async () => {
      await execa.command(command, { stdio: 'inherit' });
      // the daemon takes a while to accept connections after the app starts
      const deadline = Date.now() + DOCKER_START_TIMEOUT_MS;
      while (!(await tryExec('docker', ['info']))) {
        if (Date.now() > deadline) {
          throw new Error(`Docker did not start within ${DOCKER_START_TIMEOUT_MS / 1000}s`);
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    },
  };
};

export const dockerChecks: DoctorCheckGroup = {
  title: 'Docker',
  stopOnFailure: true,
  checks: [
    {
      title: 'Docker daemon',
      run: async () => {
        const output = await tryExec('docker', ['info', '--format', '{{json .}}']);
        if (!output) {
          return fail('Docker is not running', { fix: startDockerFix() });
        }

        const { ServerVersion, MemTotal, NCPU } = JSON.parse(output);
        const details = `Docker ${ServerVersion} · ${NCPU} CPUs · ${formatBytes(MemTotal)} memory`;
        return MemTotal < RECOMMENDED_MEMORY
          ? warn(`${details}, serverless ES may run out of memory`, {
              hint: `Give Docker at least ${formatBytes(
                RECOMMENDED_MEMORY
              )} in Docker Desktop settings → Resources`,
            })
          : pass(details);
      },
    },
    {
      title: 'Elasticsearch serverless image',
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
            hint: 'If the pull fails, log in at https://docker-auth.elastic.co/github_auth',
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
      run: async () => {
        const names = [...SERVERLESS_NODES, ...getUiamContainers({ includeOAuth: true })].map(
          ({ name }) => name
        );
        const running = ((await tryExec('docker', ['ps', '--format', '{{.Names}}'])) ?? '')
          .split('\n')
          .filter((name) => names.includes(name));

        return running.length
          ? warn(`Serverless containers are still running: ${running.join(', ')}`, {
              fix: { command: `docker kill ${running.join(' ')}`, destructive: true },
            })
          : pass('No serverless containers running');
      },
    },
  ],
};
