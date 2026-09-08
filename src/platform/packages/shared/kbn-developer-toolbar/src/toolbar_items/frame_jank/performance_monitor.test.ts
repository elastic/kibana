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

  it('waits for a real bucket and starts history with one measured value', () => {
    monitor.startMonitoring();
    expect(snapshots).toEqual([]);

    advanceFrames(121, 1000 / 120);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].history).toEqual([snapshots[0].fps]);
  });

  it('reports uncapped high-refresh FPS', () => {
    monitor.startMonitoring();
    advanceFrames(361, 1000 / 120);

    expect(snapshots.at(-1)?.fps).toBeGreaterThanOrEqual(119);
    expect(snapshots.at(-1)?.fps).toBeLessThanOrEqual(121);
    expect(snapshots.at(-1)?.minFps).toBeGreaterThanOrEqual(119);
    expect(snapshots.at(-1)?.maxFps).toBeLessThanOrEqual(121);
  });

  it('records a measured 30 FPS bucket without prefilling 60 FPS', () => {
    monitor.startMonitoring();
    advanceFrames(31, 1000 / 30);

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].fps).toBeCloseTo(30, 0);
    expect(snapshots[0].history).toEqual([snapshots[0].fps]);
  });

  it('bounds history and waits for new real data after restart', () => {
    monitor.destroy();
    monitor = new PerformanceMonitor(5);
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
    advanceFrames(721, 1000 / 120);

    expect(snapshots.at(-1)?.history).toHaveLength(5);
    monitor.stopMonitoring();
    const snapshotCount = snapshots.length;
    monitor.startMonitoring();
    expect(snapshots).toHaveLength(snapshotCount);

    advanceFrames(121, 1000 / 120);
    expect(snapshots).toHaveLength(snapshotCount + 1);
    expect(snapshots.at(-1)?.history).toHaveLength(1);
  });
});
