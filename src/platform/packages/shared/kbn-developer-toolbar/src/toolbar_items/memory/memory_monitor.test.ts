/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MemoryMonitor, type MemoryInfo } from './memory_monitor';

const MIB = 1024 * 1024;
type Snapshot = MemoryInfo | null;

const lastMeasured = (snapshots: Snapshot[]): MemoryInfo | undefined => {
  const last = snapshots.at(-1);
  return last ?? undefined;
};

describe('MemoryMonitor', () => {
  const originalMemory = Object.getOwnPropertyDescriptor(performance, 'memory');
  let monitor: MemoryMonitor;
  let snapshots: Snapshot[];
  let usedMiB: number;
  let limitMiB: number;
  let hidden: boolean;
  const readMemory = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    usedMiB = 100;
    limitMiB = 4096;
    hidden = false;
    snapshots = [];
    readMemory.mockReset();
    readMemory.mockImplementation(() => ({
      usedJSHeapSize: usedMiB * MIB,
      jsHeapSizeLimit: limitMiB * MIB,
    }));
    Object.defineProperty(performance, 'memory', { configurable: true, get: readMemory });
    jest.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    monitor = new MemoryMonitor();
    monitor.subscribe((info) => snapshots.push(info));
  });

  afterEach(() => {
    monitor.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalMemory) Object.defineProperty(performance, 'memory', originalMemory);
    else Reflect.deleteProperty(performance, 'memory');
  });

  const sampleAfter = (delay: number, nextUsedMiB: number) => {
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(delay);
    usedMiB = nextUsedMiB;
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('does no work after stop or destroy and starts a fresh session on restart', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 3; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.sampleCount).toBe(4);

    monitor.stopMonitoring();
    const readsAtStop = readMemory.mock.calls.length;
    sampleAfter(60_000, 400);
    expect(readMemory).toHaveBeenCalledTimes(readsAtStop);

    usedMiB = 400;
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.sampleCount).toBe(1);
    expect(lastMeasured(snapshots)?.memoryUsage).toBe(400);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

    monitor.destroy();
    const readsAtDestroy = readMemory.mock.calls.length;
    sampleAfter(60_000, 500);
    expect(readMemory).toHaveBeenCalledTimes(readsAtDestroy);
  });

  it('computes short trend from elapsed time across visibility gaps', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) sampleAfter(60_000, 100 + sample * 20);

    expect(lastMeasured(snapshots)?.shortTrendPerMin).toBeCloseTo(20);
  });

  it('publishes unavailable for a bad reading, retries, and replays null instead of a stale sample', () => {
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: { usedJSHeapSize: 100 * MIB },
    });
    monitor.startMonitoring();
    expect(snapshots).toEqual([null]);
    jest.advanceTimersByTime(20_000);
    expect(snapshots).toEqual([null, null]);

    Object.defineProperty(performance, 'memory', { configurable: true, get: readMemory });
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.memoryUsage).toBe(100);

    readMemory.mockReturnValue(undefined);
    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toBeNull();

    const replayed: Snapshot[] = [];
    monitor.subscribe((info) => replayed.push(info));
    expect(replayed).toEqual([null]);
  });

  it('freezes a warmup baseline, detects growth without heap pressure, and clears when the heap holds', () => {
    monitor.startMonitoring();
    hidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(60_000);
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    expect(lastMeasured(snapshots)?.sampleCount).toBe(2);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

    usedMiB = 140;
    jest.advanceTimersByTime(20_000);
    usedMiB = 160;
    jest.advanceTimersByTime(20_000);
    expect(lastMeasured(snapshots)?.sampleCount).toBe(4);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

    monitor.destroy();
    snapshots = [];
    monitor = new MemoryMonitor(8);
    monitor.subscribe((info) => snapshots.push(info));
    usedMiB = 100;
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.growthDetected).toBe(true);
    expect(lastMeasured(snapshots)?.heapUsageRatio).toBeLessThan(0.85);

    usedMiB = 300;
    for (let sample = 0; sample < 20; sample++) {
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);
    expect(lastMeasured(snapshots)?.sampleCount).toBe(8);
  });
});
