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
import type { SlotResources } from './get_slot_resources';

describe('ResourcePool', () => {
  let log: ToolingLog;
  const defaultMemoryMb = 64 * 1024;

  const createResources = (overrides?: PartialSlotResources): SlotResources => {
    return {
      warming: { cpu: 1, memory: 512, exclusive: false, ...overrides?.warming },
      running: { cpu: 1, memory: 1024, exclusive: false, ...overrides?.running },
    };
  };

  const acquireSlot = (
    pool: ResourcePool,
    label: string,
    overrides?: PartialSlotResources,
    priority?: number
  ) => {
    return pool.acquire({
      label,
      resources: createResources(overrides),
      priority,
    });
  };

  const flushTasks = async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  };

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
    const pool = new ResourcePool({ log, totalCpu: 1, totalMemory: defaultMemoryMb });
    const slot = acquireSlot(pool, 'config-1');

    await slot.waitForWarming();

    expect(slot.getPhase()).toBe(Phase.Warming);
  });

  it('queues warming requests until resources are freed', async () => {
    const pool = new ResourcePool({ log, totalCpu: 1, totalMemory: defaultMemoryMb });
    const slotOne = acquireSlot(pool, 'config-1');
    await slotOne.waitForWarming();

    const slotTwo = acquireSlot(pool, 'config-2');
    let warmed = false;
    const warmingPromise = slotTwo.waitForWarming().then(() => {
      warmed = true;
    });

    await flushTasks();
    expect(warmed).toBe(false);

    slotOne.release();
    await warmingPromise;

    expect(warmed).toBe(true);
    expect(slotTwo.getPhase()).toBe(Phase.Warming);
    slotTwo.release();
  });

  it('moves warmed slots to running immediately regardless of capacity', async () => {
    const pool = new ResourcePool({ log, totalCpu: 4, totalMemory: defaultMemoryMb });
    const slotOne = acquireSlot(pool, 'config-1', { running: { cpu: 3 } });
    await slotOne.waitForWarming();
    await slotOne.waitForRunning();

    const slotTwo = acquireSlot(pool, 'config-2', { running: { cpu: 3 } });
    await slotTwo.waitForWarming();

    await slotTwo.waitForRunning();

    const running = slotTwo.getPhase() === Phase.Running;
    expect(running).toBe(true);
    expect(slotTwo.getPhase()).toBe(Phase.Running);

    slotOne.release();
    slotTwo.release();
  });

  it('releases warming resources when slot is released before running', async () => {
    const pool = new ResourcePool({ log, totalCpu: 1, totalMemory: defaultMemoryMb });
    const slot = acquireSlot(pool, 'config-1');
    await slot.waitForWarming();

    const nextSlot = acquireSlot(pool, 'config-2');
    let warmed = false;
    const waitPromise = nextSlot.waitForWarming().then(() => {
      warmed = true;
    });

    slot.release();
    await waitPromise;

    expect(warmed).toBe(true);
    nextSlot.release();
  });

  it('prevents multiple exclusive running slots but allows non-exclusive slots', async () => {
    const pool = new ResourcePool({ log, totalCpu: 4, totalMemory: defaultMemoryMb });
    const exclusiveSlot = acquireSlot(pool, 'exclusive-runner', {
      running: { exclusive: true },
    });
    const otherExclusiveSlot = acquireSlot(pool, 'exclusive-runner-2', {
      running: { exclusive: true },
    });
    const nonExclusiveSlot = acquireSlot(pool, 'non-exclusive', {
      running: { exclusive: false },
    });

    await exclusiveSlot.waitForWarming();
    await otherExclusiveSlot.waitForWarming();
    await nonExclusiveSlot.waitForWarming();

    await exclusiveSlot.waitForRunning();

    let otherRunning = false;
    const otherRunPromise = otherExclusiveSlot.waitForRunning().then(() => {
      otherRunning = true;
    });

    let nonExclusiveRunning = false;
    const nonExclusivePromise = nonExclusiveSlot.waitForRunning().then(() => {
      nonExclusiveRunning = true;
    });

    await flushTasks();
    expect(otherRunning).toBe(false);
    expect(nonExclusiveRunning).toBe(true);

    exclusiveSlot.release();
    await otherRunPromise;

    expect(otherRunning).toBe(true);
    await nonExclusivePromise;

    otherExclusiveSlot.release();
    nonExclusiveSlot.release();
  });
});

interface PartialSlotResources {
  warming?: Partial<SlotResources['warming']>;
  running?: Partial<SlotResources['running']>;
}
