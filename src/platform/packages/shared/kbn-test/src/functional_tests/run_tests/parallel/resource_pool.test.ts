/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Writable } from 'stream';

import { Phase, ResourcePool } from './resource_pool';

describe('ResourcePool', () => {
  let log: ToolingLog;

  beforeEach(() => {
    log = new ToolingLog({
      level: 'debug',
      writeTo: new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    });
  });

  it('acquires warming capacity when available', async () => {
    const pool = new ResourcePool({ log, maxStarted: 2, maxWarming: 1, maxRunning: 1 });
    const slot = pool.acquire();

    await slot.waitForWarming();

    expect(slot.getPhase()).toBe(Phase.Warming);
  });

  it('queues warming requests when capacity is exhausted', async () => {
    const pool = new ResourcePool({ log, maxStarted: 2, maxWarming: 1, maxRunning: 1 });
    const slotOne = pool.acquire();
    await slotOne.waitForWarming();

    const slotTwo = pool.acquire();
    let warmed = false;
    const warmingPromise = slotTwo.waitForWarming().then(() => {
      warmed = true;
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(warmed).toBe(false);

    await slotOne.waitForRunning();
    await warmingPromise;

    expect(warmed).toBe(true);
    expect(slotTwo.getPhase()).toBe(Phase.Warming);
  });

  it('queues running requests until capacity becomes available', async () => {
    const pool = new ResourcePool({ log, maxStarted: 2, maxWarming: 2, maxRunning: 1 });
    const slotOne = pool.acquire();
    await slotOne.waitForWarming();
    await slotOne.waitForRunning();

    const slotTwo = pool.acquire();
    await slotTwo.waitForWarming();

    let running = false;
    const runningPromise = slotTwo.waitForRunning().then(() => {
      running = true;
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(running).toBe(false);

    slotOne.release();
    await runningPromise;

    expect(running).toBe(true);
    expect(slotTwo.getPhase()).toBe(Phase.Running);
    slotTwo.release();
  });

  it('releases started capacity even if running never begins', async () => {
    const pool = new ResourcePool({ log, maxStarted: 1, maxWarming: 1, maxRunning: 1 });
    const slot = pool.acquire();
    await slot.waitForWarming();

    const nextSlot = pool.acquire();
    let warmed = false;
    const waitPromise = nextSlot.waitForWarming().then(() => {
      warmed = true;
    });

    slot.release();
    await waitPromise;

    expect(warmed).toBe(true);
    nextSlot.release();
  });
});
