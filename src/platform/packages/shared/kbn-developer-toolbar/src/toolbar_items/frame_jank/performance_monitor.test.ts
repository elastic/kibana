/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PerformanceMonitor, type PerformanceInfo } from './performance_monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let callback: FrameRequestCallback | undefined;
  let snapshots: PerformanceInfo[];
  let now: number;

  const advanceFrames = (count: number, durationMs: number) => {
    for (let frame = 0; frame < count; frame++) {
      now += durationMs;
      const current = callback;
      callback = undefined;
      current?.(now);
    }
  };

  beforeEach(() => {
    now = 1000;
    snapshots = [];
    callback = undefined;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((next) => {
      callback = next;
      return 1;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
      callback = undefined;
    });
    monitor = new PerformanceMonitor();
    monitor.subscribe((info) => snapshots.push(info));
  });

  afterEach(() => {
    monitor.destroy();
    jest.restoreAllMocks();
  });

  it('discards startup samples and floors a slow session at 60 FPS', () => {
    monitor.startMonitoring();
    advanceFrames(91, 1000 / 30);
    expect(snapshots).toEqual([]);

    advanceFrames(61, 1000 / 60);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      baselineFps: 60,
      jankPercentage: 0,
    });
  });

  it('lowers a 120 Hz baseline for a steady 60 FPS plateau but not mixed frame rates', () => {
    monitor.startMonitoring();
    advanceFrames(961, 1000 / 120);

    const highWater = snapshots.at(-1)?.baselineFps ?? 0;
    expect(highWater).toBeGreaterThan(60);

    for (let sample = 0; sample < 8; sample++) {
      advanceFrames(30, 1000 / 30);
      advanceFrames(60, 1000 / 60);
    }
    expect(snapshots.at(-1)?.baselineFps).toBeGreaterThanOrEqual(highWater);

    advanceFrames(20 * 60, 1000 / 60);
    expect(snapshots.at(-1)?.baselineFps).toBe(60);
    expect(snapshots.at(-1)?.fps).toBeCloseTo(60, 0);
    expect(snapshots.at(-1)?.jankPercentage).toBe(0);
  });

  it('keeps the 60 FPS floor for a stable 30 FPS plateau', () => {
    monitor.destroy();
    monitor = new PerformanceMonitor(20);
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
    advanceFrames(23 * 30, 1000 / 30);

    expect(snapshots.at(-1)?.baselineFps).toBe(60);
    expect(snapshots.at(-1)?.jankPercentage).toBe(100);

    advanceFrames(22 * 60, 1000 / 60);
    expect(snapshots.at(-1)?.baselineFps).toBe(60);
    expect(snapshots.at(-1)?.jankPercentage).toBe(0);
  });

  it('resets a 120 Hz high-water after visibility restoration', () => {
    const hidden = jest.spyOn(document, 'hidden', 'get');
    hidden.mockReturnValue(false);
    monitor.startMonitoring();
    advanceFrames(961, 1000 / 120);
    expect(snapshots.at(-1)?.baselineFps).toBeGreaterThan(60);

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(snapshots.at(-1)).toEqual({
      fps: 0,
      jankPercentage: 0,
      baselineFps: 60,
      history: [],
      minFps: 0,
    });

    const afterRestore = snapshots.length;
    advanceFrames(121, 1000 / 30);
    expect(snapshots.length).toBe(afterRestore + 1);
    expect(snapshots.at(-1)?.baselineFps).toBe(60);
    expect(snapshots.at(-1)?.jankPercentage).toBe(100);
  });
});
