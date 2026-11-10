/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Net from 'net';
import type { DoctorCheck, Fix } from '../types';
import { fail, pass } from '../types';
import { defaultConfig } from '../../../servers/configs/config_sets/default/stateful/base.config';
import { getAncestorPids, getProcessCwd, getScoutServerPids, tildify, tryExec } from '../utils';

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

// serverless containers publish their ports through Docker, which must not be killed
const isDocker = (command?: string) => /^(com\.docker|docker)/.test(command ?? '');

/**
 * Of the Scout servers running anywhere on the machine, the ones that started what holds the
 * port. A start-server in another checkout, or one started for another target, holds ports of
 * its own, and stopping it would leave this one taken.
 */
const getOwningScoutServers = async (ownerPid: string, scoutServerPids: string[]) => {
  if (!scoutServerPids.length) {
    return [];
  }
  const lineage = new Set([ownerPid, ...(await getAncestorPids(ownerPid))]);
  return scoutServerPids.filter((pid) => lineage.has(pid));
};

const portCheck = (name: string, port: number): DoctorCheck => ({
  title: `${name} port ${port}`,
  run: async () => {
    const owner = await getPortOwner(port);
    if (!owner) {
      return (await isPortFree(port))
        ? pass(`${name} port ${port} is free`)
        : fail(`${name} port ${port} is used`);
    }

    // what holds the port decides, so the fix offered is one that actually frees it
    const owning = await getOwningScoutServers(owner.pid, await getScoutServerPids());
    if (owning.length) {
      const cwd = await getProcessCwd(owning[0]);
      return fail(
        `${name} port ${port} is used by Scout servers (PID ${owning.join(', ')})${
          cwd ? ` in ${tildify(cwd)}` : ''
        }`,
        {
          hint: 'stops the running Scout servers',
          fix: await stopScoutServersFix(owning),
        }
      );
    }
    return fail(
      `${name} port ${port} is used by ${owner.command} (PID ${owner.pid})`,
      isDocker(owner.command)
        ? { hint: 'stop the Docker container that publishes it' }
        : { fix: { command: `kill ${owner.pid}`, destructive: true } }
    );
  },
});

export const localServerChecks: DoctorCheck[] = [
  portCheck('Kibana', Number(defaultConfig.servers.kibana.port)),
  portCheck('Elasticsearch', Number(defaultConfig.servers.elasticsearch.port)),
];
