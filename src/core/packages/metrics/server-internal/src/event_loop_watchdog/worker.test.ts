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
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import { runWatchdogWorker } from './worker';
import { SLOT_COUNT, type LogMessage, type ProfileMessage } from './types';

describe('runWatchdogWorker', () => {
  let diagnosticDir: string;
  let main: MessagePort;
  let worker: MessagePort;

  beforeEach(() => {
    diagnosticDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'elw-worker-'));
    ({ port1: main, port2: worker } = new MessageChannel());
    runWatchdogWorker(worker, {
      shared: new SharedArrayBuffer(SLOT_COUNT * BigInt64Array.BYTES_PER_ELEMENT),
      sanitizeRoot: '/kibana',
      diagnosticDir,
    });
  });

  afterEach(() => {
    main.close();
    Fs.rmSync(diagnosticDir, { recursive: true, force: true });
  });

  it('does not write a window it recorded no block for (e.g. flagged by a replaced worker)', async () => {
    const logged = new Promise<LogMessage>((resolve) => main.once('message', resolve));
    const json = JSON.stringify({
      nodes: [],
      startTime: 0,
      endTime: 1,
      samples: [],
      timeDeltas: [],
    });
    main.postMessage({
      type: 'profile',
      json,
      stoppedAtUs: 1,
      windowStartUs: 0,
      windowEndUs: 1_000_000,
      kept: 1,
    } satisfies ProfileMessage);

    const { level, message, meta } = await logged;
    expect(level).toBe('info');
    expect(message).toContain('Not written: no block recorded for this window.');
    expect(meta?.kibana.event_loop_watchdog.profile).toMatchObject({ maxBlockedMs: 0 });
    expect(Fs.readdirSync(diagnosticDir)).toEqual([]);
  });
});
