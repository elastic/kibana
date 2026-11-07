/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import chalk from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import type { ScoutTestTarget } from '@kbn/scout-info';
import type { ToolingLog } from '@kbn/tooling-log';
import { describeServerSet, describeTarget } from './labels';
import type { PinnedConfig } from './pins';
import { onBack, select } from './prompt';

export interface RunningServers {
  pid: number;
  arch?: string;
  domain?: string;
  configSet: string;
}

export type ServersMode = 'running' | 'with-run';

const STOP_TIMEOUT_MS = 120_000;

const SERVERS_CONFIG_FILE = Path.join(SCOUT_SERVERS_ROOT, 'local.json');

/**
 * The file the tests read to reach the servers, written once when they boot. A start-server
 * process alone doesn't mean they are reachable: it may belong to another checkout, or it may
 * still be starting. Without the file the run fails deep inside a Playwright fixture instead.
 */
const hasServersConfig = () => Fs.existsSync(SERVERS_CONFIG_FILE);

const getFlag = (args: string[], name: string) => {
  const index = args.findIndex((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  return index === -1 ? undefined : args[index].split('=')[1] ?? args[index + 1];
};

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
        pid: Number(pid),
        arch: getFlag(args, 'arch'),
        domain: getFlag(args, 'domain'),
        configSet: getFlag(args, 'serverConfigSet') ?? 'default',
      },
    ];
  });
};

export const isServingConfig = (
  server: RunningServers,
  { configSet }: PinnedConfig,
  { arch, domain }: Pick<ScoutTestTarget, 'arch' | 'domain'>
) => server.configSet === configSet && server.arch === arch && server.domain === domain;

const describeServers = (servers: RunningServers[]) =>
  servers
    .map(
      (server) =>
        `${describeTarget(server)} · ${describeServerSet(server.configSet)} (PID ${server.pid})`
    )
    .join(', ');

/** start-server with ES and Kibana and everything else they started */
const getProcessTree = async (pid: number) => {
  const { stdout } = await execa('ps', ['-ax', '-o', 'pid=,ppid=']);
  const children = new Map<number, number[]>();
  for (const line of stdout.split('\n')) {
    const [child, parent] = line.trim().split(/\s+/).map(Number);
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }
  const tree = [pid];
  for (let index = 0; index < tree.length; index++) {
    tree.push(...(children.get(tree[index]) ?? []));
  }
  return tree;
};

const isAlive = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
};

/** Stops start-server with ES and Kibana, and waits until they have exited */
const stopServers = async (servers: RunningServers[]) => {
  // ES and Kibana outlive start-server on SIGTERM, so each of them gets it too
  const pids = (await Promise.all(servers.map(({ pid }) => getProcessTree(pid)))).flat();
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already exited
    }
  }

  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (pids.some(isAlive)) {
    if (Date.now() > deadline) {
      throw new Error(`Scout servers did not stop within ${STOP_TIMEOUT_MS / 1000}s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

const findServers = async (config: PinnedConfig, target: ScoutTestTarget) => {
  const servers = await getRunningServers();
  const matching = servers.find((server) => isServingConfig(server, config, target));
  return { servers, matching, usable: matching && hasServersConfig() ? matching : undefined };
};

const askAboutServers = async (
  log: ToolingLog,
  config: PinnedConfig,
  target: ScoutTestTarget
): Promise<ServersMode | undefined> => {
  const { servers, matching, usable } = await findServers(config, target);
  if (usable) {
    log.write(chalk.dim(`Using the Scout servers running for this target (PID ${usable.pid})`));
    return 'running';
  }
  if (matching) {
    log.write(
      chalk.yellow(
        `Scout servers for this target are running (PID ${matching.pid}), but ${Path.relative(
          REPO_ROOT,
          SERVERS_CONFIG_FILE
        )} is missing, so the tests can't reach them. They are either still starting or they ` +
          `belong to another checkout.`
      )
    );
  }
  if (servers.length) {
    // servers for this target would fail to start on the ports they hold
    if (!matching) {
      log.write(
        chalk.yellow(
          `Scout servers are running for ${describeServers(
            servers
          )}, these tests need ${describeTarget(target)} · ${describeServerSet(config.configSet)}`
        )
      );
    }
    const stop = await select('Stop them?', [
      { label: 'Yes, stop them', value: true },
      { label: 'Cancel', value: false },
    ]);
    if (!stop) {
      return undefined;
    }
    log.write(chalk.dim('Stopping Scout servers…'));
    await stopServers(servers);
  }

  const mode = await select<ServersMode | 'other-terminal'>('Servers', [
    { label: 'Start them in another terminal', value: 'other-terminal', hint: 'fast reruns' },
    { label: 'Start them with the tests', value: 'with-run', hint: 'stopped after each run' },
  ]);
  if (mode !== 'other-terminal') {
    return mode;
  }

  const startServer = [
    'node scripts/scout start-server',
    `--arch ${target.arch} --domain ${target.domain}`,
    ...(config.configSet === 'default' ? [] : [`--serverConfigSet ${config.configSet}`]),
  ].join(' ');
  log.write(
    `\nRun in another terminal and wait until the servers are ready:\n  ${chalk.cyan(
      startServer
    )}\n`
  );

  for (;;) {
    const ready = await select('Servers ready?', [
      { label: 'Yes', value: true },
      { label: 'Cancel', value: false },
    ]);
    if (!ready) {
      return undefined;
    }
    const found = await findServers(config, target);
    if (found.usable) {
      return 'running';
    }
    log.write(
      chalk.yellow(
        found.matching
          ? `Scout servers are up but still starting, ${Path.relative(
              REPO_ROOT,
              SERVERS_CONFIG_FILE
            )} is not written yet`
          : `No Scout servers for ${describeTarget(target)} found yet`
      )
    );
  }
};

/** Finds or starts servers for the tests; Esc or Cancel skips the run */
export const prepareServers = (log: ToolingLog, config: PinnedConfig, target: ScoutTestTarget) =>
  onBack(askAboutServers(log, config, target), undefined);
