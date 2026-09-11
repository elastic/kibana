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
  static rejectBufferedObserve = false;
  type?: string;
  options?: PerformanceObserverInit;
  private connected = false;

  constructor(private readonly callback: PerformanceObserverCallback) {
    TimingObserver.instances.push(this);
  }

  observe(options: PerformanceObserverInit = {}): void {
    if (TimingObserver.rejectBufferedObserve && options.buffered) {
      throw new Error('buffered observe unsupported');
    }
    this.options = options;
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
  interactionId: number | undefined,
  startTime = performance.now(),
  name = 'click'
): PerformanceEventTiming => ({
  name,
  entryType: 'event',
  duration,
  startTime,
  ...(interactionId === undefined ? {} : { interactionId }),
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

const installObserver = () => {
  TimingObserver.instances = [];
  TimingObserver.rejectBufferedObserve = false;
  Object.defineProperty(globalThis, 'PerformanceObserver', {
    configurable: true,
    value: TimingObserver,
  });
};

const restoreObserver = (originalObserver: PropertyDescriptor | undefined) => {
  if (originalObserver) Object.defineProperty(globalThis, 'PerformanceObserver', originalObserver);
  else Reflect.deleteProperty(globalThis, 'PerformanceObserver');
};

describe('LongTaskMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: LongTaskMonitor;
  let snapshots: LongTaskInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    installObserver();
    snapshots = [];
    monitor = new LongTaskMonitor();
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
  });

  afterEach(() => {
    monitor.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    restoreObserver(originalObserver);
  });

  it('expires task statistics without another task and cancels expiry while stopped', () => {
    deliver([timingEntry(300), timingEntry(80)]);
    expect(snapshots.at(-1)).toEqual({
      totalBlockingTime: 280,
      tasksInLast30Seconds: 1,
      worstTaskDuration: 300,
      worstTaskStartTime: 0,
    });

    jest.advanceTimersByTime(10_000);
    deliver([timingEntry(100), timingEntry(80)]);
    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toMatchObject({
      totalBlockingTime: 80,
      tasksInLast30Seconds: 1,
      worstTaskDuration: 100,
    });

    const publicationsBeforeStop = snapshots.length;
    monitor.stopMonitoring();
    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeStop);

    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      totalBlockingTime: 0,
      tasksInLast30Seconds: 0,
      worstTaskDuration: 0,
      worstTaskStartTime: null,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects buffered pre-session tasks and still records tasks when buffered observe is unavailable', () => {
    monitor.stopMonitoring();
    jest.advanceTimersByTime(5_000);
    monitor.startMonitoring();
    deliver([timingEntry(400, 1_000)]);
    expect(snapshots.at(-1)?.tasksInLast30Seconds).toBe(0);

    deliver([timingEntry(250, performance.now())]);
    expect(snapshots.at(-1)?.tasksInLast30Seconds).toBe(1);

    monitor.destroy();
    TimingObserver.instances = [];
    TimingObserver.rejectBufferedObserve = true;
    snapshots = [];
    monitor = new LongTaskMonitor();
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();

    expect(TimingObserver.instances.at(-1)?.options).toEqual({ entryTypes: ['longtask'] });
    deliver([timingEntry(180, performance.now())]);
    expect(snapshots.at(-1)?.tasksInLast30Seconds).toBe(1);
  });
});

describe('INPMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: INPMonitor;
  let snapshots: INPInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    installObserver();
    snapshots = [];
    monitor = new INPMonitor();
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();
  });

  afterEach(() => {
    monitor.destroy();
    jest.useRealTimers();
    jest.restoreAllMocks();
    restoreObserver(originalObserver);
  });

  it('expires slow-interaction statistics and cancels expiry while stopped', () => {
    deliverEvents([eventEntry(300, 1)]);
    jest.advanceTimersByTime(10_000);
    deliverEvents([eventEntry(100, 2), eventEntry(80, 3)]);
    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 100,
      slowInteractionsCount: 1,
      worstInteractionDelay: 100,
      worstInteractionStartTime: 10_000,
    });

    const publicationsBeforeStop = snapshots.length;
    monitor.stopMonitoring();
    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeStop);

    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      worstInteractionStartTime: null,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects buffered pre-session interactions and accepts in-session interactions', () => {
    monitor.stopMonitoring();
    jest.advanceTimersByTime(5_000);
    monitor.startMonitoring();
    deliverEvents([eventEntry(400, 1, 1_000)]);
    expect(snapshots.at(-1)?.slowInteractionsCount).toBe(0);

    deliverEvents([eventEntry(220, 2, performance.now())]);
    expect(snapshots.at(-1)?.slowInteractionsCount).toBe(1);
  });

  it('reports p75 of unique slow interactions and coalesces one interactionId', () => {
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
      worstInteractionStartTime: 0,
    });

    deliverEvents([
      eventEntry(250, 7, performance.now(), 'pointerdown'),
      eventEntry(200, 7, performance.now(), 'click'),
      eventEntry(200, 0, performance.now(), 'mousedown'),
    ]);
    expect(snapshots.at(-1)?.slowInteractionsCount).toBe(5);
    expect(snapshots.at(-1)?.worstInteractionDelay).toBe(400);
  });
});
