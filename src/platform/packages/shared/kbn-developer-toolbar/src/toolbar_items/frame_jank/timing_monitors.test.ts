/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LongTaskMonitor, type LongTaskInfo } from './long_task_monitor';

class TimingObserver implements PerformanceObserver {
  static supportedEntryTypes = ['longtask'];
  static instances: TimingObserver[] = [];
  type?: string;
  private connected = false;

  constructor(private readonly callback: PerformanceObserverCallback) {
    TimingObserver.instances.push(this);
  }

  observe(options: PerformanceObserverInit = {}): void {
    this.type = options.type ?? options.entryTypes?.[0];
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  takeRecords(): PerformanceEntry[] {
    return [];
  }

  deliver(entries: PerformanceEntry[]): void {
    if (!this.connected) return;
    this.callback(
      {
        getEntries: () => entries,
        getEntriesByType: (type) => entries.filter((entry) => entry.entryType === type),
        getEntriesByName: (name) => entries.filter((entry) => entry.name === name),
      },
      this
    );
  }
}

const timingEntry = (duration: number, startTime = performance.now()): PerformanceEntry => ({
  name: 'longtask',
  entryType: 'longtask',
  duration,
  startTime,
  toJSON: () => ({ name: 'longtask', duration, startTime }),
});

const deliver = (entries: PerformanceEntry[]) => {
  for (const observer of TimingObserver.instances) {
    if (observer.type === 'longtask') observer.deliver(entries);
  }
};

describe('LongTaskMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: LongTaskMonitor;
  let snapshots: LongTaskInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    TimingObserver.instances = [];
    Object.defineProperty(globalThis, 'PerformanceObserver', {
      configurable: true,
      value: TimingObserver,
    });
    snapshots = [];
    monitor = new LongTaskMonitor();
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
  });

  afterEach(() => {
    monitor.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    if (originalObserver)
      Object.defineProperty(globalThis, 'PerformanceObserver', originalObserver);
    else Reflect.deleteProperty(globalThis, 'PerformanceObserver');
  });

  it('expires task statistics and last duration without another task', () => {
    deliver([timingEntry(300), timingEntry(80)]);
    expect(snapshots.at(-1)).toEqual({
      duration: 300,
      totalBlockingTime: 250,
      tasksInLast30Seconds: 1,
    });

    jest.advanceTimersByTime(10_000);
    deliver([timingEntry(100), timingEntry(80)]);

    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toEqual({
      duration: 100,
      totalBlockingTime: 50,
      tasksInLast30Seconds: 1,
    });

    jest.advanceTimersByTime(10_000);
    expect(snapshots.at(-1)).toEqual({
      duration: 0,
      totalBlockingTime: 0,
      tasksInLast30Seconds: 0,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels expiry while stopped and prunes retained tasks on restart', () => {
    deliver([timingEntry(300)]);
    const publicationsBeforeStop = snapshots.length;
    monitor.stopMonitoring();

    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeStop);

    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      duration: 0,
      totalBlockingTime: 0,
      tasksInLast30Seconds: 0,
    });
    expect(jest.getTimerCount()).toBe(0);
  });
});
