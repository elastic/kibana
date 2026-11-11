/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import http from 'http';
import type { AddressInfo } from 'net';
import os from 'os';
import path from 'path';
import { readStatusFile } from './status_file';
import { Supervisor, sortByDependencies } from './supervisor';
import type { ProcessDefinition, ProcessState } from './types';

const node = (
  id: string,
  script: string,
  rest: Partial<ProcessDefinition> = {}
): ProcessDefinition => ({
  id,
  command: process.execPath,
  args: ['-e', script],
  ready: { type: 'spawned' },
  stopTimeoutMs: 2000,
  ...rest,
});

const KEEP_ALIVE = 'setInterval(() => {}, 1000);';

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const waitForState = (supervisor: Supervisor, id: string, state: ProcessState) =>
  new Promise<void>((resolve) => {
    const matches = () =>
      supervisor.getStatus().processes.find((status) => status.id === id)?.state === state;
    if (matches()) {
      resolve();
      return;
    }
    const unsubscribe = supervisor.onChange(() => {
      if (matches()) {
        unsubscribe();
        resolve();
      }
    });
  });

const statusOf = (supervisor: Supervisor, id: string) => {
  const status = supervisor.getStatus().processes.find((candidate) => candidate.id === id);
  if (!status) {
    throw new Error(`no status for ${id}`);
  }
  return status;
};

describe('sortByDependencies', () => {
  it('puts every process after the processes it depends on', () => {
    const sorted = sortByDependencies([
      node('kibana', '', { dependsOn: ['es', 'emulator'] }),
      node('emulator', ''),
      node('es', ''),
    ]);
    expect(sorted.map(({ id }) => id)).toEqual(['es', 'emulator', 'kibana']);
  });

  it('rejects unknown dependencies, duplicate ids and cycles', () => {
    expect(() => sortByDependencies([node('kibana', '', { dependsOn: ['es'] })])).toThrow(
      'Process "kibana" depends on unknown process "es"'
    );
    expect(() => sortByDependencies([node('es', ''), node('es', '')])).toThrow(
      'Process id "es" is defined more than once'
    );
    expect(() =>
      sortByDependencies([node('a', '', { dependsOn: ['b'] }), node('b', '', { dependsOn: ['a'] })])
    ).toThrow('Process dependencies form a cycle: a -> b -> a');
  });
});

describe('Supervisor', () => {
  let logDir: string;
  let supervisor: Supervisor | undefined;

  beforeEach(() => {
    logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-'));
  });

  afterEach(async () => {
    await supervisor?.stopAll();
    supervisor = undefined;
    fs.rmSync(logDir, { recursive: true, force: true });
  });

  it('starts a process once its dependency logs that it is ready', async () => {
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('kibana', KEEP_ALIVE, { dependsOn: ['es'] }),
        node(
          'es',
          `setTimeout(() => console.log('cluster \\u001b[32mready\\u001b[39m'), 300); ${KEEP_ALIVE}`,
          {
            ready: { type: 'log', pattern: /cluster ready/ },
          }
        ),
      ],
    });
    const lines: string[] = [];
    supervisor.onLine(({ processId, text }) => lines.push(`${processId}: ${text}`));

    const started = supervisor.startAll();
    await waitForState(supervisor, 'es', 'starting');
    expect(statusOf(supervisor, 'kibana').state).toBe('waiting');

    await started;
    await waitForState(supervisor, 'kibana', 'ready');
    const es = statusOf(supervisor, 'es');
    const kibana = statusOf(supervisor, 'kibana');
    expect(es.state).toBe('ready');
    expect(Date.parse(kibana.startedAt ?? '')).toBeGreaterThanOrEqual(Date.parse(es.readyAt ?? ''));
    expect(lines).toContain('es: cluster ready');
    expect(fs.readFileSync(path.join(logDir, 'es.log'), 'utf8')).toContain('cluster');

    const result = readStatusFile(path.join(logDir, 'status.json'));
    expect(result.type).toBe('running');
    expect(result.type !== 'missing' && result.status.processes.map(({ state }) => state)).toEqual([
      'ready',
      'ready',
    ]);
  });

  it('polls an http readiness check until it answers with a 2xx status', async () => {
    let requests = 0;
    const server = http.createServer((_request, response) => {
      requests += 1;
      response.statusCode = requests < 3 ? 503 : 200;
      response.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      supervisor = new Supervisor({
        logDir,
        definitions: [
          node('es', KEEP_ALIVE, {
            ready: { type: 'http', url: `http://127.0.0.1:${port}/`, intervalMs: 50 },
          }),
        ],
      });
      await supervisor.startAll();
      await waitForState(supervisor, 'es', 'ready');
      expect(requests).toBe(3);
    } finally {
      server.close();
    }
  });

  it('marks dependents failed without starting them when a dependency fails', async () => {
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('es', 'process.exit(3)', { ready: { type: 'log', pattern: /never/ } }),
        node('kibana', KEEP_ALIVE, { dependsOn: ['es'] }),
      ],
    });
    await supervisor.startAll();

    expect(statusOf(supervisor, 'es')).toMatchObject({
      state: 'failed',
      exitCode: 3,
      error: 'exited with code 3',
    });
    expect(statusOf(supervisor, 'kibana')).toMatchObject({
      state: 'failed',
      error: 'dependency not ready: es is failed: exited with code 3',
    });
    expect(statusOf(supervisor, 'kibana').pid).toBeUndefined();
  });

  it('marks a process failed when it is not ready in time', async () => {
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('es', KEEP_ALIVE, { ready: { type: 'log', pattern: /never/ }, readyTimeoutMs: 100 }),
      ],
    });
    await supervisor.startAll();
    await waitForState(supervisor, 'es', 'failed');
    expect(statusOf(supervisor, 'es').error).toBe('not ready after 0.1s');
  });

  it('stops the whole process group, including grandchildren', async () => {
    const spawnGrandchild = `
      const { spawn } = require('child_process');
      const grandchild = spawn(process.execPath, ['-e', '${KEEP_ALIVE}'], { stdio: 'ignore' });
      console.log('grandchild ' + grandchild.pid);
      ${KEEP_ALIVE}
    `;
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('es', spawnGrandchild, { ready: { type: 'log', pattern: /grandchild \d+/ } }),
      ],
    });
    let grandchildPid = 0;
    supervisor.onLine(({ text }) => {
      const match = /grandchild (\d+)/.exec(text);
      if (match) grandchildPid = Number(match[1]);
    });
    await supervisor.startAll();
    await waitForState(supervisor, 'es', 'ready');
    expect(isAlive(grandchildPid)).toBe(true);

    await supervisor.stop('es');

    expect(statusOf(supervisor, 'es').state).toBe('stopped');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(isAlive(grandchildPid)).toBe(false);
  });

  it('waits for grandchildren that outlive the process itself, like the Elasticsearch JVM', async () => {
    const slowGrandchild = `process.on('SIGTERM', () => setTimeout(() => process.exit(0), 500)); ${KEEP_ALIVE}`;
    const spawnSlowGrandchild = `
      const { spawn } = require('child_process');
      const grandchild = spawn(process.execPath, ['-e', ${JSON.stringify(
        slowGrandchild
      )}], { stdio: 'ignore' });
      setTimeout(() => console.log('grandchild ' + grandchild.pid), 200);
      ${KEEP_ALIVE}
    `;
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('es', spawnSlowGrandchild, { ready: { type: 'log', pattern: /grandchild \d+/ } }),
      ],
    });
    let grandchildPid = 0;
    supervisor.onLine(({ text }) => {
      const match = /grandchild (\d+)/.exec(text);
      if (match) grandchildPid = Number(match[1]);
    });
    await supervisor.startAll();
    await waitForState(supervisor, 'es', 'ready');

    const states: string[] = [];
    supervisor.onChange(({ state }) => states.push(state));
    await supervisor.stop('es');

    expect(isAlive(grandchildPid)).toBe(false);
    expect(states).toEqual(['stopping', 'stopping', 'stopped']);
    expect(statusOf(supervisor, 'es').error).toBeUndefined();
  });

  it('stops the children of a process that dies by itself', async () => {
    const dieAndLeaveGrandchild = `
      const { spawn } = require('child_process');
      const grandchild = spawn(process.execPath, ['-e', '${KEEP_ALIVE}'], { stdio: 'ignore' });
      console.log('grandchild ' + grandchild.pid);
      setTimeout(() => process.exit(1), 200);
    `;
    supervisor = new Supervisor({
      logDir,
      definitions: [node('es', dieAndLeaveGrandchild)],
    });
    let grandchildPid = 0;
    supervisor.onLine(({ text }) => {
      const match = /grandchild (\d+)/.exec(text);
      if (match) grandchildPid = Number(match[1]);
    });
    await supervisor.startAll();
    await waitForState(supervisor, 'es', 'failed');
    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(grandchildPid).toBeGreaterThan(0);
    expect(isAlive(grandchildPid)).toBe(false);
  });

  it('restarts one process without touching the others', async () => {
    supervisor = new Supervisor({
      logDir,
      definitions: [node('es', KEEP_ALIVE), node('kibana', KEEP_ALIVE, { dependsOn: ['es'] })],
    });
    await supervisor.startAll();
    const esPid = statusOf(supervisor, 'es').pid;
    const kibanaPid = statusOf(supervisor, 'kibana').pid;

    await supervisor.restart('kibana');

    expect(statusOf(supervisor, 'es').pid).toBe(esPid);
    expect(statusOf(supervisor, 'kibana')).toMatchObject({ state: 'ready' });
    expect(statusOf(supervisor, 'kibana').pid).not.toBe(kibanaPid);
  });

  it('does not start a waiting process that was stopped', async () => {
    supervisor = new Supervisor({
      logDir,
      definitions: [
        node('es', `setTimeout(() => console.log('up'), 200); ${KEEP_ALIVE}`, {
          ready: { type: 'log', pattern: /up/ },
        }),
        node('kibana', KEEP_ALIVE, { dependsOn: ['es'] }),
      ],
    });
    const started = supervisor.startAll();
    await waitForState(supervisor, 'kibana', 'waiting');
    await supervisor.stop('kibana');
    await started;

    expect(statusOf(supervisor, 'es').state).toBe('ready');
    expect(statusOf(supervisor, 'kibana').state).toBe('stopped');
    expect(statusOf(supervisor, 'kibana').pid).toBeUndefined();
  });

  it('resolves whenAllEnded once every process has exited', async () => {
    supervisor = new Supervisor({ logDir, definitions: [node('es', 'process.exit(0)')] });
    await supervisor.startAll();
    await supervisor.whenAllEnded();
    expect(statusOf(supervisor, 'es')).toMatchObject({ state: 'exited', exitCode: 0 });
  });
});

describe('readStatusFile', () => {
  it('reports a status written by a supervisor that is no longer running as stale', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbn-dev-procs-'));
    const file = path.join(dir, 'status.json');
    try {
      expect(readStatusFile(file)).toEqual({ type: 'missing' });
      // PIDs are capped well below this value on every supported platform.
      fs.writeFileSync(
        file,
        JSON.stringify({ supervisorPid: 2 ** 30, startedAt: '', updatedAt: '', processes: [] })
      );
      expect(readStatusFile(file).type).toBe('stale');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
