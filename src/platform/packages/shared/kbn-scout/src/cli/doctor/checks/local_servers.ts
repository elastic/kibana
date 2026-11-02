/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Net from 'net';
import type { DoctorCheck, DoctorCheckGroup } from '../types';
import { fail, pass, warn } from '../types';
import { defaultConfig } from '../../../servers/configs/config_sets/default/stateful/base.config';
import { tryExec } from '../utils';

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

const getScoutServerPids = async () => {
  const output = await tryExec('ps', ['-ax', '-o', 'pid=,command=']);
  return (output ?? '').split('\n').flatMap((line) => {
    const [pid, command, ...args] = line.trim().split(/\s+/);
    return /(^|\/)node$/.test(command) && args.join(' ').includes('scripts/scout start-server')
      ? [pid]
      : [];
  });
};

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
          hint: 'Reuse them with run-tests, or stop them before starting new ones',
          fix: { command: `kill ${scoutServerPids.join(' ')}`, destructive: true },
        }
      );
    }
    return fail(
      `${name} port ${port} is used${usedBy}`,
      owner ? { fix: { command: `kill ${owner.pid}`, destructive: true } } : undefined
    );
  },
});

export const localServerChecks: DoctorCheckGroup = {
  title: 'Local servers',
  checks: [
    portCheck('Kibana', Number(defaultConfig.servers.kibana.port)),
    portCheck('Elasticsearch', Number(defaultConfig.servers.elasticsearch.port)),
  ],
};
