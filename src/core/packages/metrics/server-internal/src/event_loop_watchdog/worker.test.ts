/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'node:fs';
import Os from 'node:os';
import Path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import type { CpuProfile } from './profile_summary';
import { SLOT_COUNT, Slot, monotonicUs, type LogMessage } from './types';
import { runWatchdogWorker, type InspectorSession } from './worker';

const PROFILE: CpuProfile = {
  nodes: [
    {
      id: 1,
      callFrame: { functionName: '(root)', url: '', lineNumber: -1, columnNumber: -1 },
      children: [2],
    },
    {
      id: 2,
      callFrame: {
        functionName: 'spin',
        url: 'file:///kibana/src/spin.ts',
        lineNumber: 0,
        columnNumber: 0,
      },
    },
  ],
  startTime: 0,
  endTime: 30_000,
  samples: [2, 2, 2],
  timeDeltas: [10_000, 10_000, 10_000],
};

describe('runWatchdogWorker', () => {
  let diagnosticDir: string;
  let main: MessagePort;
  let logs: LogMessage[];
  let sessions: Array<InspectorSession & { posted: string[]; disconnected: boolean }>;
  let blocked: boolean;
  let heartbeat: NodeJS.Timeout;

  const start = (profiling = { afterMs: 300, maxMs: 2_000, cooldownMs: 60_000 }) => {
    const shared = new SharedArrayBuffer(SLOT_COUNT * BigInt64Array.BYTES_PER_ELEMENT);
    const slots = new BigInt64Array(shared);
    blocked = false;
    heartbeat = setInterval(() => {
      if (!blocked) Atomics.store(slots, Slot.heartbeat, BigInt(monotonicUs()));
    }, 10);
    Atomics.store(slots, Slot.heartbeat, BigInt(monotonicUs()));
    const channel = new MessageChannel();
    main = channel.port1;
    main.on('message', (message: LogMessage) => logs.push(message));
    runWatchdogWorker(
      channel.port2,
      { shared, sanitizeRoot: '/kibana', diagnosticDir, profiling },
      () => {
        const session = {
          posted: [] as string[],
          disconnected: false,
          connectToMainThread: jest.fn(),
          post: (
            method: string,
            _params: object,
            callback: (e: Error | null, r?: object) => void
          ) => {
            session.posted.push(method);
            setImmediate(() =>
              callback(null, method === 'Profiler.stop' ? { profile: PROFILE } : {})
            );
          },
          disconnect: () => {
            session.disconnected = true;
          },
        };
        sessions.push(session);
        return session;
      }
    );
  };
  const block = async (ms: number) => {
    blocked = true;
    await sleep(ms);
    blocked = false;
  };
  const profileLogs = () =>
    logs.filter(({ message }) => message.startsWith('Event loop block profile'));
  const waitForProfileLogs = async (count: number) => {
    for (let i = 0; i < 200 && profileLogs().length < count; i++) await sleep(10);
    return profileLogs();
  };

  beforeEach(() => {
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-worker-'));
    logs = [];
    sessions = [];
  });

  afterEach(() => {
    clearInterval(heartbeat);
    main.close();
    Fs.rmSync(diagnosticDir, { recursive: true, force: true });
  });

  it('profiles a block once it lasts long enough, writing the profile and ending the session', async () => {
    start();
    await block(700);
    const [profileLog] = await waitForProfileLogs(1);
    expect(sessions).toHaveLength(1);
    const [session] = sessions;
    expect(session.connectToMainThread).toHaveBeenCalled();
    expect(session.posted).toEqual([
      'Profiler.enable',
      'Profiler.setSamplingInterval',
      'Profiler.start',
      'Profiler.stop',
    ]);
    expect(session.disconnected).toBe(true);
    expect(profileLog.level).toBe('warn');
    expect(profileLog.message).toMatch(
      /^Event loop block profile #1: block ~\d+ms \(profiled after ~\d+ms, profiler start took ~\d+ms\), 3 samples\. Top: 100% spin \(src\/spin\.ts:1\)\. Kibana code: 100% spin \(src\/spin\.ts:1\)\. File: /
    );
    const [file] = Fs.readdirSync(diagnosticDir);
    expect(file).toMatch(/^event-loop-block-startup-000\d{3}ms-.*\.cpuprofile$/);
    expect(JSON.parse(Fs.readFileSync(Path.join(diagnosticDir, file), 'utf8'))).toEqual(PROFILE);
  });

  it('does not profile blocks shorter than the profiling threshold', async () => {
    start();
    await block(250);
    await sleep(200);
    expect(logs.some(({ message }) => message.startsWith('Event loop blocked for ~'))).toBe(true);
    expect(sessions).toHaveLength(0);
  });

  it('profiles at most once per cooldown', async () => {
    start();
    await block(500);
    await waitForProfileLogs(1);
    await block(500);
    await sleep(200);
    expect(sessions).toHaveLength(1);
  });

  it('stops profiling a block that lasts too long, keeping what was sampled', async () => {
    start({ afterMs: 300, maxMs: 300, cooldownMs: 60_000 });
    const ended = block(1_200);
    const [profileLog] = await waitForProfileLogs(1);
    expect(blocked).toBe(true); // still blocked when the profile was taken
    expect(profileLog.message).toContain('3 samples');
    await ended;
  });
});
