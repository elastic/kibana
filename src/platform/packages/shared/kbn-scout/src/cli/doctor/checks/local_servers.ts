/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Net from 'net';
import execa from 'execa';
import type { DoctorCheck, DoctorCheckGroup, Fix } from '../types';
import { fail, pass, warn } from '../types';
import { defaultConfig } from '../../../servers/configs/config_sets/default/stateful/base.config';
import { getScoutServerPids, tryExec } from '../utils';

const canListen = (port: number, host: string) =>
  new Promise<boolean>((resolve) => {
    const server = Net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(port, host);
  });

// ES and Kibana may bind the IPv4 or the IPv6 loopback
const isPortFree = async (port: number) =>
  (await Promise.all(['127.0.0.1', '::1'].map((host) => canListen(port, host)))).every(Boolean);

const getPortOwner = async (port: number) => {
  // lsof -F prints one field per line: p<pid>, c<command>
  const output = await tryExec('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-Fpc']);
  const fields = new Map(output?.split('\n').map((line) => [line[0], line.slice(1)]));
  const pid = fields.get('p');
  return pid ? { pid, command: fields.get('c') } : undefined;
};

// ES and Kibana outlive start-server on SIGTERM, so stop its whole process group when it leads one
const stopScoutServersFix = async (pids: string[]): Promise<Fix> => {
  const targets = await Promise.all(
    pids.map(async (pid) =>
      (await tryExec('ps', ['-o', 'pgid=', '-p', pid]))?.trim() === pid ? `-${pid}` : pid
    )
  );
  return { command: `kill -- ${targets.join(' ')}`, destructive: true };
};

// Docker publishes the ports of serverless containers, so stop the containers, not Docker
const isDocker = (command?: string) => /^(com\.docker|docker)/.test(command ?? '');

const stopContainersFix = (port: number): Fix => ({
  command: `docker ps -q --filter publish=${port} | xargs docker kill`,
  destructive: true,
  run: async () => {
    const ids = (await tryExec('docker', ['ps', '-q', '--filter', `publish=${port}`]))
      ?.split('\n')
      .filter(Boolean);
    if (ids?.length) {
      await execa('docker', ['kill', ...ids], { stdio: 'inherit' });
    }
  },
});

const portCheck = (name: string, port: number): DoctorCheck => ({
  title: `${name} port ${port}`,
  run: async () => {
    const owner = await getPortOwner(port);
    if (!owner && (await isPortFree(port))) {
      return pass(`${name} port ${port} is free`);
    }

    const scoutServerPids = await getScoutServerPids();
    const usedBy = owner ? ` by ${owner.command} (PID ${owner.pid})` : '';
    if (scoutServerPids.length) {
      return warn(
        `${name} port ${port} is used${usedBy}, Scout servers are already running (PID ${scoutServerPids.join(
          ', '
        )})`,
        {
          hint: 'stops the running Scout servers, say no to keep using them',
          fix: await stopScoutServersFix(scoutServerPids),
        }
      );
    }
    if (!owner) {
      return fail(`${name} port ${port} is used`);
    }
    return fail(`${name} port ${port} is used${usedBy}`, {
      fix: isDocker(owner.command)
        ? stopContainersFix(port)
        : { command: `kill ${owner.pid}`, destructive: true },
    });
  },
});

export const localServerChecks: DoctorCheckGroup = {
  title: 'Local servers',
  checks: [
    portCheck('Kibana', Number(defaultConfig.servers.kibana.port)),
    portCheck('Elasticsearch', Number(defaultConfig.servers.elasticsearch.port)),
  ],
};
