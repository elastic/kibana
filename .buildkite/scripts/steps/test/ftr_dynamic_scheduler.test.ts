/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { createFtrScheduler } from './ftr_dynamic_scheduler.ts';

describe('FTR dynamic scheduler', () => {
  it('claims each config once, retries test failures, and keeps queues separate', async () => {
    const scheduler = createFtrScheduler(
      {
        workerCount: 2,
        retryCount: 1,
        tasks: [
          { config: 'long.ts', queue: 'vm', expectedDurationMin: 20 },
          { config: 'short.ts', queue: 'vm', expectedDurationMin: 5 },
          { config: 'other.ts', queue: 'special', expectedDurationMin: 10 },
        ],
      },
      'secret'
    );
    scheduler.server.listen(0, '127.0.0.1');
    await once(scheduler.server, 'listening');
    const port = (scheduler.server.address() as AddressInfo).port;
    const post = async (path: string, body: object) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    try {
      const [first, second] = await Promise.all([
        post('/claim', { queue: 'vm', workerId: 'worker-1' }),
        post('/claim', { queue: 'vm', workerId: 'worker-2' }),
      ]);
      expect(new Set([first.body.config, second.body.config])).toEqual(
        new Set(['long.ts', 'short.ts'])
      );
      expect((await post('/claim', { queue: 'vm', workerId: 'worker-3' })).body).toEqual({
        wait: true,
      });
      expect((await post('/claim', { queue: 'special', workerId: 'worker-3' })).body.config).toBe(
        'other.ts'
      );

      expect((await post('/complete', { leaseId: first.body.leaseId, exitCode: 10 })).body).toEqual(
        { ok: true }
      );
      expect((await post('/claim', { queue: 'vm', workerId: 'worker-2' })).body.config).toBe(
        first.body.config
      );
      expect(scheduler.summary().failures).toEqual([]);
    } finally {
      scheduler.server.close();
    }
  });

  it('requeues an expired lease and rejects stale completion', async () => {
    let currentTime = 0;
    const scheduler = createFtrScheduler(
      {
        workerCount: 1,
        retryCount: 0,
        tasks: [{ config: 'lost.ts', queue: 'vm', expectedDurationMin: 5 }],
      },
      'secret',
      20,
      () => currentTime
    );
    scheduler.server.listen(0, '127.0.0.1');
    await once(scheduler.server, 'listening');
    const port = (scheduler.server.address() as AddressInfo).port;
    const post = async (path: string, body: object) => {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: { authorization: 'Bearer secret', 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };

    try {
      const first = await post('/claim', { queue: 'vm', workerId: 'lost-worker' });
      currentTime = 21;
      const recovered = await post('/claim', { queue: 'vm', workerId: 'new-worker' });
      expect(recovered.body.config).toBe('lost.ts');
      expect(recovered.body.leaseId).not.toBe(first.body.leaseId);
      expect((await post('/complete', { leaseId: first.body.leaseId, exitCode: 0 })).status).toBe(
        409
      );
      await post('/complete', { leaseId: recovered.body.leaseId, exitCode: 0 });
      await post('/done', { workerId: 'new-worker' });
      expect(scheduler.summary()).toEqual({
        finished: true,
        failures: [],
        completedWorkers: 1,
      });
    } finally {
      scheduler.server.close();
    }
  });
});
