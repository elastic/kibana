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
type MemoryReading = { usedJSHeapSize: number; jsHeapSizeLimit: number } | undefined;

const lastMeasured = (snapshots: Snapshot[]): MemoryInfo | undefined => {
  const last = snapshots.at(-1);
  return last ?? undefined;
};
const shortTrend = (snapshots: Snapshot[]) => lastMeasured(snapshots)?.shortTrendPerMin;

describe('MemoryMonitor', () => {
  const originalMemory = Object.getOwnPropertyDescriptor(performance, 'memory');
  let monitor: MemoryMonitor;
  let snapshots: Snapshot[];
  let usedMiB: number;
  let limitMiB: number;
  let hidden: boolean;
  let memoryReading: MemoryReading;
  const readMemory = jest.fn(() => memoryReading);

  beforeEach(() => {
    jest.useFakeTimers();
    usedMiB = 100;
    limitMiB = 4096;
    hidden = false;
    snapshots = [];
    memoryReading = { usedJSHeapSize: usedMiB * MIB, jsHeapSizeLimit: limitMiB * MIB };
    readMemory.mockClear();
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

  it('does no work after stop and starts a fresh session when restarted', () => {
    monitor.startMonitoring();
    expect(snapshots).toHaveLength(1);

    monitor.stopMonitoring();
    const readsAtStop = readMemory.mock.calls.length;
    const publicationsAtStop = snapshots.length;
    sampleAfter(60_000, 200);
    expect(readMemory).toHaveBeenCalledTimes(readsAtStop);
    expect(snapshots).toHaveLength(publicationsAtStop);

    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.sampleCount).toBe(1);
    expect(lastMeasured(snapshots)?.memoryUsage).toBe(200);
    monitor.stopMonitoring();
    const readsAfterRestartStop = readMemory.mock.calls.length;
    const publicationsAfterRestartStop = snapshots.length;
    jest.advanceTimersByTime(60_000);
    expect(readMemory).toHaveBeenCalledTimes(readsAfterRestartStop);
    expect(snapshots).toHaveLength(publicationsAfterRestartStop);
  });

  it('does no visibility-driven work after destroy', () => {
    monitor.startMonitoring();
    monitor.destroy();
    const readsAtDestroy = readMemory.mock.calls.length;
    const publicationsAtDestroy = snapshots.length;
    sampleAfter(60_000, 200);

    expect(readMemory).toHaveBeenCalledTimes(readsAtDestroy);
    expect(snapshots).toHaveLength(publicationsAtDestroy);
  });

  it('uses elapsed time for one-minute visibility gaps', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) sampleAfter(60_000, 100 + sample * 20);

    expect(shortTrend(snapshots)).toBeCloseTo(20);
  });

  it('preserves the regular twenty-second cadence trend', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }

    expect(shortTrend(snapshots)).toBeCloseTo(60);
  });

  it('uses elapsed time for irregular visibility gaps', () => {
    monitor.startMonitoring();
    let elapsed = 0;
    for (const gap of [1000, 7000, 2500, 11_000, 3500, 9000, 1700, 8000, 2200, 6000]) {
      elapsed += gap;
      sampleAfter(gap, 100 + (elapsed / 60_000) * 20);
    }

    expect(shortTrend(snapshots)).toBeCloseTo(20);
  });

  it('reports finite zero trends for constant heap and identical timestamps', () => {
    usedMiB = 150;
    monitor.startMonitoring();
    for (const gap of [1000, 7000, 2500, 11_000, 3500, 9000, 1700, 8000, 2200, 6000]) {
      sampleAfter(gap, usedMiB);
    }
    expect(shortTrend(snapshots)).toBe(0);

    monitor.stopMonitoring();
    jest.spyOn(performance, 'now').mockReturnValue(1000);
    monitor.startMonitoring();
    for (let sample = 0; sample < 10; sample++) {
      hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    }

    expect(Number.isFinite(shortTrend(snapshots) ?? Number.NaN)).toBe(true);
    expect(shortTrend(snapshots)).toBe(0);
  });

  it('publishes unavailable for a partial API and keeps retrying', () => {
    Object.defineProperty(performance, 'memory', {
      configurable: true,
      value: { usedJSHeapSize: 100 * MIB },
    });

    expect(monitor.isSupported()).toBe(false);
    monitor.startMonitoring();
    expect(snapshots).toEqual([null]);
    jest.advanceTimersByTime(20_000);
    expect(snapshots).toEqual([null, null]);
  });

  it('handles throwing memory getters and continues its retry lifecycle', () => {
    readMemory.mockImplementation(() => {
      throw new Error('memory unavailable');
    });

    expect(MemoryMonitor.isSupported()).toBe(false);
    monitor.startMonitoring();
    expect(snapshots).toEqual([null]);
    jest.advanceTimersByTime(20_000);
    expect(snapshots).toEqual([null, null]);
  });

  it.each([
    ['negative usage', -1, 100],
    ['NaN usage', Number.NaN, 100],
    ['infinite usage', Number.POSITIVE_INFINITY, 100],
    ['zero limit', 1, 0],
    ['negative limit', 1, -1],
    ['NaN limit', 1, Number.NaN],
    ['infinite limit', 1, Number.POSITIVE_INFINITY],
  ])('rejects %s without fabricating a sample', (_label, used, limit) => {
    readMemory.mockReturnValue({ usedJSHeapSize: used, jsHeapSizeLimit: limit });

    expect(monitor.isSupported()).toBe(false);
    monitor.startMonitoring();
    expect(snapshots).toEqual([null]);
  });

  it('retains samples through valid to unavailable to valid cadence samples', () => {
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.sampleCount).toBe(1);

    readMemory.mockReturnValue(undefined);
    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toBeNull();

    readMemory.mockImplementation(() => ({
      usedJSHeapSize: 200 * MIB,
      jsHeapSizeLimit: 4096 * MIB,
    }));
    jest.advanceTimersByTime(20_000);
    expect(lastMeasured(snapshots)?.sampleCount).toBe(2);
    expect(lastMeasured(snapshots)?.memoryUsage).toBe(200);
  });

  it('replays the actual measured ratio and growth snapshot to late subscribers', () => {
    limitMiB = 320;
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }
    const measured = lastMeasured(snapshots);
    expect(measured?.growthDetected).toBe(true);
    expect(measured?.heapUsageRatio).toBeCloseTo(300 / 320);

    const replayed: Snapshot[] = [];
    monitor.subscribe((info) => replayed.push(info));
    expect(replayed).toEqual([measured]);
  });

  it('freezes a warmup median only after elapsed time and four samples', () => {
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.sampleCount).toBe(1);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

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
  });

  it('detects growth without heap pressure against the frozen baseline', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }

    const measured = lastMeasured(snapshots);
    expect(measured?.growthDetected).toBe(true);
    expect(measured?.heapUsageRatio).toBeLessThan(0.85);
  });

  it('clears growth when heap holds and keeps the frozen baseline across rollover', () => {
    monitor.destroy();
    monitor = new MemoryMonitor(8);
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.growthDetected).toBe(true);

    usedMiB = 300;
    for (let sample = 0; sample < 20; sample++) {
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);
    expect(lastMeasured(snapshots)?.sampleCount).toBe(8);
  });

  it('starts a new baseline window after restart', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 3; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.sampleCount).toBe(4);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

    usedMiB = 400;
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.sampleCount).toBe(1);
    expect(lastMeasured(snapshots)?.memoryUsage).toBe(400);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);

    for (let sample = 1; sample <= 3; sample++) {
      usedMiB = 400 + sample * 10;
      jest.advanceTimersByTime(20_000);
    }
    expect(lastMeasured(snapshots)?.sampleCount).toBe(4);
    expect(lastMeasured(snapshots)?.growthDetected).toBe(false);
  });

  it('replays null after a failed sample instead of a stale measurement', () => {
    monitor.startMonitoring();
    readMemory.mockReturnValue(undefined);
    jest.advanceTimersByTime(20_000);

    const replayed: Snapshot[] = [];
    monitor.subscribe((info) => replayed.push(info));
    expect(replayed).toEqual([null]);
  });

  it('allows ratios above one without clamping', () => {
    readMemory.mockReturnValue({ usedJSHeapSize: 200 * MIB, jsHeapSizeLimit: 100 * MIB });
    monitor.startMonitoring();
    expect(lastMeasured(snapshots)?.heapUsageRatio).toBe(2);
  });
});
