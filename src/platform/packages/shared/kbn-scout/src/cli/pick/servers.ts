/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';

export interface RunningServers {
  pid: string;
  arch?: string;
  domain?: string;
  configSet: string;
}

const getFlag = (args: string[], name: string) => {
  const index = args.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  return index === -1 ? undefined : args[index].split('=')[1] ?? args[index + 1];
};

const STOP_TIMEOUT_MS = 120_000;

/** `node scripts/scout start-server` processes with the target they were started for */
export const getRunningServers = async (): Promise<RunningServers[]> => {
  const { stdout } = await execa('ps', ['-ax', '-o', 'pid=,command=']);
  return stdout.split('\n').flatMap((line) => {
    const [pid, command, ...args] = line.trim().split(/\s+/);
    if (!/(^|\/)node$/.test(command) || !args.join(' ').includes('scripts/scout start-server')) {
      return [];
    }
    return [
      {
        pid,
        arch: getFlag(args, 'arch'),
        domain: getFlag(args, 'domain'),
        configSet: getFlag(args, 'serverConfigSet') ?? 'default',
      },
    ];
  });
};

const isGroupRunning = async (pgid: string) =>
  (await execa('pgrep', ['-g', pgid], { reject: false })).exitCode === 0;

/** Stops start-server with ES and Kibana, and waits until they have exited */
export const stopServers = async (servers: RunningServers[]) => {
  const groups = await Promise.all(
    servers.map(async ({ pid }) => {
      const { stdout } = await execa('ps', ['-o', 'pgid=', '-p', pid], { reject: false });
      // ES and Kibana outlive start-server on SIGTERM, so stop its whole process group when it leads one
      const pgid = stdout.trim();
      process.kill(pgid === pid ? -Number(pid) : Number(pid), 'SIGTERM');
      return pgid;
    })
  );

  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const running = await Promise.all(groups.map(isGroupRunning));
    if (!running.some(Boolean)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Scout servers did not stop within ${STOP_TIMEOUT_MS / 1000}s`);
};
