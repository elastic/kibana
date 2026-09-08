/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INPMonitor, type INPInfo, type PerformanceEventTiming } from './inp_monitor';
import { LongTaskMonitor, type LongTaskInfo } from './long_task_monitor';

class TimingObserver implements PerformanceObserver {
  static supportedEntryTypes = ['longtask', 'event'];
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

const eventEntry = (
  duration: number,
  interactionId: number,
  startTime = performance.now(),
  name = 'click'
): PerformanceEventTiming => ({
  name,
  entryType: 'event',
  duration,
  startTime,
  interactionId,
  processingStart: startTime,
  processingEnd: startTime + duration,
  toJSON: () => ({ name, duration, startTime, interactionId }),
});

const deliver = (entries: PerformanceEntry[]) => {
  for (const observer of TimingObserver.instances) {
    if (observer.type === 'longtask') observer.deliver(entries);
  }
};

const deliverEvents = (entries: PerformanceEventTiming[]) => {
  for (const observer of TimingObserver.instances) {
    if (observer.type === 'event') observer.deliver(entries);
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

describe('INPMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: INPMonitor;
  let snapshots: INPInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    TimingObserver.instances = [];
    Object.defineProperty(globalThis, 'PerformanceObserver', {
      configurable: true,
      value: TimingObserver,
    });
    snapshots = [];
    monitor = new INPMonitor();
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

  it('expires all interaction statistics at exact idle window boundaries', () => {
    deliverEvents([eventEntry(300, 1)]);

    jest.advanceTimersByTime(10_000);
    deliverEvents([eventEntry(100, 2), eventEntry(80, 3)]);

    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 100,
      slowInteractionsCount: 1,
      worstInteractionDelay: 100,
      lastInteractionDelay: 100,
    });

    jest.advanceTimersByTime(10_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels expiry across stop, restart, destroy, and stop during publication', () => {
    deliverEvents([eventEntry(300, 1)]);
    const publicationsBeforeStop = snapshots.length;
    monitor.stopMonitoring();

    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeStop);

    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
    });
    expect(jest.getTimerCount()).toBe(0);

    deliverEvents([eventEntry(200, 2)]);
    const publicationsBeforeDestroy = snapshots.length;
    monitor.destroy();
    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeDestroy);
    expect(jest.getTimerCount()).toBe(0);

    const stoppingMonitor = new INPMonitor();
    stoppingMonitor.subscribe((info) => {
      if (info.slowInteractionsCount > 0) stoppingMonitor.stopMonitoring();
    });
    stoppingMonitor.startMonitoring();
    deliverEvents([eventEntry(150, 3)]);
    expect(jest.getTimerCount()).toBe(0);
    stoppingMonitor.destroy();
  });

  it('deduplicates interaction maxima and derives last from retained start times', () => {
    deliverEvents([eventEntry(200, 1)]);
    jest.advanceTimersByTime(1_000);
    deliverEvents([eventEntry(300, 1)]);
    jest.advanceTimersByTime(1_000);
    deliverEvents([
      eventEntry(150, 2),
      eventEntry(120, 3, 500),
      eventEntry(180, 4, 2_000),
      eventEntry(250, 1, 2_500),
    ]);

    expect(snapshots.at(-1)).toEqual({
      currentINP: 180,
      slowInteractionsCount: 4,
      worstInteractionDelay: 300,
      lastInteractionDelay: 180,
    });

    jest.advanceTimersByTime(29_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 180,
      slowInteractionsCount: 2,
      worstInteractionDelay: 180,
      lastInteractionDelay: 180,
    });

    jest.advanceTimersByTime(1_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
    });
  });

  it('reports nearest-rank p75 for unique slow interactions only', () => {
    deliverEvents([
      eventEntry(100, 1),
      eventEntry(200, 2),
      eventEntry(300, 3),
      eventEntry(400, 4),
      eventEntry(80, 5),
    ]);

    expect(snapshots.at(-1)).toEqual({
      currentINP: 300,
      slowInteractionsCount: 4,
      worstInteractionDelay: 400,
      lastInteractionDelay: 400,
    });
  });
});
