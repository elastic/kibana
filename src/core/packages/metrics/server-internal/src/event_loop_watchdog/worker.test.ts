/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setTimeout as sleep } from 'node:timers/promises';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import { SLOT_COUNT, Slot, monotonicUs, type LogMessage } from './types';
import { runWatchdogWorker, type InspectorSession } from './worker';

const CALL_FRAMES = [
  { functionName: 'init', location: { scriptId: '1', lineNumber: 11 } },
  { functionName: 'spin', location: { scriptId: '2', lineNumber: 0 } },
];
const SCRIPTS = [
  { scriptId: '1', url: 'file:///kibana/node_modules/zod/core.cjs' },
  { scriptId: '2', url: 'file:///kibana/src/spin.ts' },
];

type Listener = (message: { params: any }) => void;

describe('runWatchdogWorker (debugger sampling)', () => {
  let main: MessagePort;
  let logs: LogMessage[];
  let posted: string[];
  let listeners: Map<string, Listener[]>;
  let blocked: boolean;
  let heartbeat: NodeJS.Timeout;
  let failOn: Set<string>;
  let disconnect: jest.Mock;

  const emit = (event: string, message: Parameters<Listener>[0]) =>
    listeners.get(event)?.forEach((listener) => listener(message));

  const start = (
    profiling = { afterMs: 300, maxMs: 2_000, cooldownMs: 60_000, sampleIntervalMs: 50 }
  ) => {
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
    const session: InspectorSession = {
      connectToMainThread: jest.fn(),
      on: (event: string, listener: Listener) =>
        listeners.set(event, [...(listeners.get(event) ?? []), listener]),
      post: (method, params, callback) => {
        if (failOn.has(method)) {
          setImmediate(() => callback(new Error(`${method} failed`)));
          return;
        }
        posted.push(
          method === 'Debugger.setSkipAllPauses'
            ? `skip:${(params as { skip: boolean }).skip}`
            : method
        );
        setImmediate(() => {
          if (method === 'Debugger.enable')
            SCRIPTS.forEach((script) => emit('Debugger.scriptParsed', { params: script }));
          callback(null, {});
          if (method === 'Debugger.pause')
            emit('Debugger.paused', { params: { callFrames: CALL_FRAMES } });
        });
      },
      disconnect,
    };
    runWatchdogWorker(channel.port2, { shared, sanitizeRoot: '/kibana', profiling }, () => session);
  };
  const block = async (ms: number) => {
    blocked = true;
    await sleep(ms);
    blocked = false;
  };
  const sampleLogs = () =>
    logs.filter(({ message }) => message.startsWith('Event loop block stack samples'));

  beforeEach(() => {
    logs = [];
    posted = [];
    listeners = new Map();
    failOn = new Set();
    disconnect = jest.fn();
  });

  afterEach(() => {
    clearInterval(heartbeat);
    main.close();
  });

  it('enables the debugger at start, skipping pauses from the outset', async () => {
    start();
    await sleep(50);
    expect(posted.slice(0, 2)).toEqual(['Debugger.enable', 'skip:true']);
    expect(logs[0].message).toMatch(
      /^Event loop watchdog debugger enabled in [\d.]+ms \(2 scripts\)$/
    );
  });

  it('samples the stack while a block lasts, allowing pauses only around each sample', async () => {
    start();
    await sleep(50);
    posted = [];
    await block(700);
    await sleep(100);
    const [samplesLog] = sampleLogs();
    // first sample: skip off + pause, then resume + skip on
    expect(posted.slice(0, 4)).toEqual([
      'skip:false',
      'Debugger.pause',
      'Debugger.resume',
      'skip:true',
    ]);
    const meta = samplesLog.meta!.kibana.event_loop_watchdog.samples as Record<string, unknown>;
    expect(meta.samples).toBeGreaterThanOrEqual(3);
    expect(meta).toMatchObject({ captured: 1, sampleIntervalMs: 50, unrequestedPauses: 0 });
    expect(samplesLog.message).toContain('Kibana code: 100% spin (src/spin.ts:1)');
    expect(samplesLog.message).toMatch(/first sample after ~\d+ms/);
  });

  it('resumes pauses it did not request (e.g. `debugger;` statements)', async () => {
    start();
    await sleep(50);
    posted = [];
    emit('Debugger.paused', { params: { callFrames: CALL_FRAMES } });
    await sleep(20);
    expect(posted).toEqual(['Debugger.resume']);
  });

  it.each(['Debugger.pause', 'Debugger.resume'])(
    'disconnects (releasing any pause) and stops sampling when %s fails during a sample',
    async (method) => {
      start();
      await sleep(50);
      failOn.add(method);
      await block(600);
      await sleep(100);
      expect(disconnect).toHaveBeenCalled();
      expect(logs.map(({ message }) => message)).toContainEqual(
        expect.stringMatching(/^Event loop stack sampling disabled: could not (pause|resume)/)
      );
    }
  );

  it('disconnects when the debugger cannot be fully enabled (pauses not skipped)', async () => {
    failOn.add('Debugger.setSkipAllPauses');
    start();
    await sleep(50);
    expect(disconnect).toHaveBeenCalled();
    expect(logs.map(({ message }) => message)).toContain(
      'Event loop stack sampling disabled: could not enable the debugger: Debugger.setSkipAllPauses failed'
    );
  });

  it('disconnects when an unrequested pause cannot be resumed', async () => {
    start();
    await sleep(50);
    failOn.add('Debugger.resume');
    emit('Debugger.paused', { params: { callFrames: CALL_FRAMES } });
    await sleep(20);
    expect(disconnect).toHaveBeenCalled();
  });

  it('does not sample blocks shorter than the threshold, and at most once per cooldown', async () => {
    start();
    await sleep(50);
    await block(250);
    await sleep(100);
    expect(sampleLogs()).toHaveLength(0);
    await block(600);
    await sleep(100);
    await block(600);
    await sleep(100);
    expect(sampleLogs()).toHaveLength(1);
  });
});
