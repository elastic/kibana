/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_SERVERLESS_DEFAULT_IMAGE, SERVERLESS_NODES, getUiamContainers } from '@kbn/es';
import type { DoctorCheckGroup } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge, formatBytes, tryExec } from '../utils';

const RECOMMENDED_MEMORY = 15 * 1024 ** 3;

export const dockerChecks: DoctorCheckGroup = {
  title: 'Docker',
  stopOnFailure: true,
  checks: [
    {
      title: 'Docker daemon',
      run: async () => {
        const output = await tryExec('docker', ['info', '--format', '{{json .}}']);
        if (!output) {
          return fail('Docker is not running', 'Start Docker Desktop');
        }

        const { ServerVersion, MemTotal, NCPU } = JSON.parse(output);
        const details = `Docker ${ServerVersion} · ${NCPU} CPUs · ${formatBytes(MemTotal)} memory`;
        return MemTotal < RECOMMENDED_MEMORY
          ? warn(
              `${details}, serverless ES may run out of memory`,
              `Give Docker at least ${formatBytes(RECOMMENDED_MEMORY)} in Docker Desktop settings`
            )
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
          return warn(
            `${ES_SERVERLESS_DEFAULT_IMAGE} is not pulled yet`,
            'start-server pulls it on the first run; if the pull fails, log in at https://docker-auth.elastic.co/github_auth'
          );
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
          ? warn(
              `Serverless containers are still running: ${running.join(', ')}`,
              `docker kill ${running.join(' ')}`
            )
          : pass('No serverless containers running');
      },
    },
  ],
};
