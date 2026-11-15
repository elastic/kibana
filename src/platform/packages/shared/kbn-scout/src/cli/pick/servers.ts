/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { timeoutSignal } from '@kbn/std';
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

interface ServersConfig {
  hosts?: { kibana?: string };
  auth?: { username?: string; password?: string };
}

const readServersConfig = (): ServersConfig | undefined => {
  try {
    return JSON.parse(Fs.readFileSync(SERVERS_CONFIG_FILE, 'utf8'));
  } catch {
    return undefined;
  }
};

/**
 * Whether the servers answer. The config file is written before Elasticsearch and Kibana are
 * started, so its presence only means a start-server got that far; running tests against it
 * while it boots fails deep inside a Playwright fixture instead.
 */
const isKibanaReady = async (): Promise<boolean> => {
  const config = readServersConfig();
  if (!config?.hosts?.kibana) {
    return false;
  }

  const { username, password } = config.auth ?? {};
  try {
    const deadline2 = timeoutSignal(5_000);
    try {
      const response = await fetch(new URL('/api/status', config.hosts.kibana), {
        headers: username
          ? { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` }
          : {},
        signal: deadline2,
      });
      return response.ok;
    } finally {
      deadline2.dispose();
    }
  } catch {
    return false;
  }
};

/** The directory a process was started in, so servers of another checkout can be told apart */
const getProcessCwd = async (pid: number): Promise<string | undefined> => {
  const { stdout } = await execa('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
    reject: false,
  });
  return stdout
    .split('\n')
    .find((line) => line.startsWith('n'))
    ?.slice(1);
};

/** Why a server started for the right target still can't be used */
type MatchState = 'ready' | 'other-checkout' | 'starting';

const inspectMatch = async (pid: number): Promise<MatchState> => {
  const cwd = await getProcessCwd(pid);
  // without lsof the checkout can't be told, and readiness is the only thing left to go on
  if (cwd && Path.resolve(cwd) !== Path.resolve(REPO_ROOT)) {
    return 'other-checkout';
  }
  return (await isKibanaReady()) ? 'ready' : 'starting';
};

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

const describeUnusable = (matching: RunningServers, state?: MatchState) =>
  state === 'other-checkout'
    ? `Scout servers for this target are running (PID ${matching.pid}), but they were started ` +
      `in another checkout, so the tests would not run against this one`
    : `Scout servers for this target are running (PID ${matching.pid}), but they are not ` +
      `answering yet, so they are most likely still starting`;

const describeServers = (servers: RunningServers[]) =>
  servers
    .map(
      (server) =>
        `${describeTarget(server)} · ${describeServerSet(server.configSet)} (PID ${server.pid})`
    )
    .join(', ');

/** The given processes with everything they started, so ES and Kibana come along with their server */
const getProcessTrees = async (pids: number[]) => {
  const { stdout } = await execa('ps', ['-ax', '-o', 'pid=,ppid=']);
  const children = new Map<number, number[]>();
  for (const line of stdout.split('\n')) {
    const [child, parent] = line.trim().split(/\s+/).map(Number);
    children.set(parent, [...(children.get(parent) ?? []), child]);
  }

  const tree = [...new Set(pids)];
  const seen = new Set(tree);
  for (let index = 0; index < tree.length; index++) {
    for (const child of children.get(tree[index]) ?? []) {
      // trees overlap when one server started another, and a pid is only signalled once
      if (!seen.has(child)) {
        seen.add(child);
        tree.push(child);
      }
    }
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
  const pids = await getProcessTrees(servers.map(({ pid }) => pid));
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
  const state = matching ? await inspectMatch(matching.pid) : undefined;
  return { servers, matching, state, usable: state === 'ready' ? matching : undefined };
};

const askAboutServers = async (
  log: ToolingLog,
  config: PinnedConfig,
  target: ScoutTestTarget
): Promise<ServersMode | undefined> => {
  const { servers, matching, state, usable } = await findServers(config, target);
  if (usable) {
    log.write(chalk.dim(`Using the Scout servers running for this target (PID ${usable.pid})`));
    return 'running';
  }
  if (matching) {
    log.write(chalk.yellow(describeUnusable(matching, state)));
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
          ? describeUnusable(found.matching, found.state)
          : `No Scout servers for ${describeTarget(target)} found yet`
      )
    );
  }
};

/** Finds or starts servers for the tests; Esc or Cancel skips the run */
export const prepareServers = (log: ToolingLog, config: PinnedConfig, target: ScoutTestTarget) =>
  onBack(askAboutServers(log, config, target), undefined);
