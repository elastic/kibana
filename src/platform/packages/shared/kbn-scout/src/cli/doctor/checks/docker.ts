/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import { ES_SERVERLESS_DEFAULT_IMAGE, SERVERLESS_NODES, getUiamContainers } from '@kbn/es';
import type { DoctorCheckGroup, Fix } from '../types';
import { fail, pass, warn } from '../types';
import { formatAge, formatBytes, tildify, tryExec } from '../utils';

const RECOMMENDED_CPUS = 12;
const RECOMMENDED_MEMORY_GB = 15;
const RECOMMENDED_MEMORY = RECOMMENDED_MEMORY_GB * 1024 ** 3;
// Docker Desktop reports a bit less memory than it is given, e.g. 15.6 GB for 16 GB
const DOCKER_DESKTOP_MEMORY_MIB = (RECOMMENDED_MEMORY_GB + 1) * 1024;
const DOCKER_DESKTOP_SETTINGS = Path.join(
  Os.homedir(),
  'Library/Group Containers/group.com.docker/settings-store.json'
);
const DOCKER_START_TIMEOUT_MS = 120_000;

const waitForDocker = async () => {
  // the daemon takes a while to accept connections after the app starts
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

/** Raises Docker Desktop resources on macOS; elsewhere Docker uses the host resources directly */
const resizeDockerDesktopFix = (cpus: number, memoryBytes: number): Fix | undefined => {
  const targetCpus = Math.max(cpus, Math.min(RECOMMENDED_CPUS, Os.cpus().length));
  // leave the host at least 8 GB
  const canRaiseMemory = Os.totalmem() >= DOCKER_DESKTOP_MEMORY_MIB * 1024 ** 2 + 8 * 1024 ** 3;
  const raiseMemory = memoryBytes < RECOMMENDED_MEMORY && canRaiseMemory;
  if (
    process.platform !== 'darwin' ||
    !Fs.existsSync(DOCKER_DESKTOP_SETTINGS) ||
    (targetCpus === cpus && !raiseMemory)
  ) {
    return undefined;
  }

  const changes = {
    ...(targetCpus > cpus ? { Cpus: targetCpus } : {}),
    ...(raiseMemory ? { MemoryMiB: DOCKER_DESKTOP_MEMORY_MIB } : {}),
  };
  return {
    command: `docker desktop stop, set ${Object.entries(changes)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ')} in ${tildify(DOCKER_DESKTOP_SETTINGS)}, docker desktop start`,
    destructive: true,
    run: async () => {
      await execa('docker', ['desktop', 'stop'], { stdio: 'inherit' });
      const settings = JSON.parse(await Fs.promises.readFile(DOCKER_DESKTOP_SETTINGS, 'utf8'));
      await Fs.promises.writeFile(
        DOCKER_DESKTOP_SETTINGS,
        JSON.stringify({ ...settings, ...changes }, null, 2)
      );
      await execa('docker', ['desktop', 'start'], { stdio: 'inherit' });
      await waitForDocker();
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
        if (NCPU >= RECOMMENDED_CPUS && MemTotal >= RECOMMENDED_MEMORY) {
          return pass(details);
        }

        const recommended = `${RECOMMENDED_CPUS} CPUs and ${RECOMMENDED_MEMORY_GB} GB RAM`;
        const fix = resizeDockerDesktopFix(NCPU, MemTotal);
        return warn(
          `${details}, ${chalk.yellow(`multi-project serverless tests need ${recommended}`)}`,
          {
            fix,
            hint: fix
              ? 'restarts Docker Desktop and stops its containers'
              : `Give Docker ${recommended} if this machine allows it (Docker Desktop settings → Resources)`,
          }
        );
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
