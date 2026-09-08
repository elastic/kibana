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

const shortTrend = (snapshots: MemoryInfo[]) => snapshots.at(-1)?.details?.shortTrendPerMin;
const longTrend = (snapshots: MemoryInfo[]) => snapshots.at(-1)?.details?.longTrendPerMin;

describe('MemoryMonitor', () => {
  const originalMemory = Object.getOwnPropertyDescriptor(performance, 'memory');
  let monitor: MemoryMonitor;
  let snapshots: MemoryInfo[];
  let usedMiB: number;
  let hidden: boolean;
  const readMemory = jest.fn(() => ({
    usedJSHeapSize: usedMiB * MIB,
    totalJSHeapSize: usedMiB * MIB * 1.1,
    jsHeapSizeLimit: 4096 * MIB,
  }));

  beforeEach(() => {
    jest.useFakeTimers();
    usedMiB = 100;
    hidden = false;
    snapshots = [];
    readMemory.mockClear();
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
    expect(readMemory).toHaveBeenCalledTimes(2);

    monitor.stopMonitoring();
    sampleAfter(60_000, 200);
    expect(snapshots).toHaveLength(1);
    expect(readMemory).toHaveBeenCalledTimes(2);

    monitor.startMonitoring();
    expect(snapshots).toHaveLength(2);
    expect(snapshots.at(-1)?.history).toEqual([200]);
    monitor.stopMonitoring();
    jest.advanceTimersByTime(60_000);
    expect(snapshots).toHaveLength(2);
  });

  it('does no visibility-driven work after destroy', () => {
    monitor.startMonitoring();
    monitor.destroy();
    sampleAfter(60_000, 200);

    expect(snapshots).toHaveLength(1);
    expect(readMemory).toHaveBeenCalledTimes(2);
  });

  it('uses elapsed time for one-minute visibility gaps', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      sampleAfter(60_000, 100 + sample * 20);
    }

    expect(shortTrend(snapshots)).toBeCloseTo(20);
    expect(longTrend(snapshots)).toBeCloseTo(20);
  });

  it('preserves the regular twenty-second cadence trend', () => {
    monitor.startMonitoring();
    for (let sample = 1; sample <= 10; sample++) {
      usedMiB = 100 + sample * 20;
      jest.advanceTimersByTime(20_000);
    }

    expect(shortTrend(snapshots)).toBeCloseTo(60);
    expect(longTrend(snapshots)).toBeCloseTo(60);
  });

  it('uses elapsed time for irregular visibility gaps', () => {
    monitor.startMonitoring();
    let elapsed = 0;
    for (const gap of [1000, 7000, 2500, 11_000, 3500, 9000, 1700, 8000, 2200, 6000]) {
      elapsed += gap;
      sampleAfter(gap, 100 + (elapsed / 60_000) * 20);
    }

    expect(shortTrend(snapshots)).toBeCloseTo(20);
    expect(longTrend(snapshots)).toBeCloseTo(20);
  });

  it('reports finite zero trends for constant heap and identical timestamps', () => {
    usedMiB = 150;
    monitor.startMonitoring();
    for (const gap of [1000, 7000, 2500, 11_000, 3500, 9000, 1700, 8000, 2200, 6000]) {
      sampleAfter(gap, usedMiB);
    }
    expect(shortTrend(snapshots)).toBe(0);
    expect(longTrend(snapshots)).toBe(0);

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
    expect(Number.isFinite(longTrend(snapshots) ?? Number.NaN)).toBe(true);
    expect(shortTrend(snapshots)).toBe(0);
    expect(longTrend(snapshots)).toBe(0);
  });
});
