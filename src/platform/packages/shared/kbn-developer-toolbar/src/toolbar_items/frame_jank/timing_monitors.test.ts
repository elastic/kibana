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

describe('LongTaskMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: LongTaskMonitor;
  let snapshots: LongTaskInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    TimingObserver.instances = [];
    TimingObserver.rejectBufferedObserve = false;
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
      worstTaskDuration: 300,
      worstTaskStartTime: 0,
    });

    jest.advanceTimersByTime(10_000);
    deliver([timingEntry(100), timingEntry(80)]);

    jest.advanceTimersByTime(20_000);
    expect(snapshots.at(-1)).toEqual({
      duration: 100,
      totalBlockingTime: 50,
      tasksInLast30Seconds: 1,
      worstTaskDuration: 100,
      worstTaskStartTime: 10_000,
    });

    jest.advanceTimersByTime(10_000);
    expect(snapshots.at(-1)).toEqual({
      duration: 0,
      totalBlockingTime: 0,
      tasksInLast30Seconds: 0,
      worstTaskDuration: 0,
      worstTaskStartTime: null,
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
      worstTaskDuration: 0,
      worstTaskStartTime: null,
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('selects worst task metadata deterministically and falls back as tasks expire', () => {
    deliver([timingEntry(400, 0), timingEntry(400, 1_000), timingEntry(300, 2_000)]);
    expect(snapshots.at(-1)).toMatchObject({
      duration: 300,
      worstTaskDuration: 400,
      worstTaskStartTime: 1_000,
    });

    jest.advanceTimersByTime(31_000);
    expect(snapshots.at(-1)).toMatchObject({
      worstTaskDuration: 300,
      worstTaskStartTime: 2_000,
    });

    jest.advanceTimersByTime(1_000);
    expect(snapshots.at(-1)).toMatchObject({
      worstTaskDuration: 0,
      worstTaskStartTime: null,
    });
  });

  it('rejects buffered pre-session tasks and accepts in-session tasks', () => {
    expect(TimingObserver.instances.at(-1)?.options).toEqual({ type: 'longtask', buffered: true });

    monitor.stopMonitoring();
    jest.advanceTimersByTime(5_000);
    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      duration: 0,
      totalBlockingTime: 0,
      tasksInLast30Seconds: 0,
      worstTaskDuration: 0,
      worstTaskStartTime: null,
    });

    deliver([timingEntry(400, 1_000)]);
    expect(snapshots.at(-1)?.tasksInLast30Seconds).toBe(0);

    deliver([timingEntry(250, performance.now())]);
    expect(snapshots.at(-1)).toMatchObject({
      duration: 250,
      tasksInLast30Seconds: 1,
      worstTaskDuration: 250,
    });
  });

  it('still records tasks when buffered observe is unavailable', () => {
    monitor.destroy();
    TimingObserver.instances = [];
    TimingObserver.rejectBufferedObserve = true;
    snapshots = [];
    monitor = new LongTaskMonitor();
    monitor.subscribe((info) => snapshots.push(info));
    monitor.startMonitoring();

    expect(TimingObserver.instances.at(-1)?.options).toEqual({ entryTypes: ['longtask'] });
    deliver([timingEntry(180, performance.now())]);
    expect(snapshots.at(-1)).toMatchObject({
      duration: 180,
      tasksInLast30Seconds: 1,
    });
  });

  it('cancels expiry on destroy and after a subscriber stops publication', () => {
    deliver([timingEntry(300)]);
    const publicationsBeforeDestroy = snapshots.length;
    monitor.destroy();
    jest.advanceTimersByTime(31_000);
    expect(snapshots).toHaveLength(publicationsBeforeDestroy);
    expect(jest.getTimerCount()).toBe(0);

    const stoppingMonitor = new LongTaskMonitor();
    stoppingMonitor.subscribe((info) => {
      if (info.tasksInLast30Seconds > 0) stoppingMonitor.stopMonitoring();
    });
    stoppingMonitor.startMonitoring();
    deliver([timingEntry(150)]);
    expect(jest.getTimerCount()).toBe(0);
    stoppingMonitor.destroy();
  });
});

describe('INPMonitor', () => {
  const originalObserver = Object.getOwnPropertyDescriptor(globalThis, 'PerformanceObserver');
  let monitor: INPMonitor;
  let snapshots: INPInfo[];

  beforeEach(() => {
    jest.useFakeTimers();
    TimingObserver.instances = [];
    TimingObserver.rejectBufferedObserve = false;
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
      worstInteractionStartTime: 10_000,
    });

    jest.advanceTimersByTime(10_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
      worstInteractionStartTime: null,
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
      worstInteractionStartTime: null,
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

  it('rejects buffered pre-session interactions and accepts in-session interactions', () => {
    expect(TimingObserver.instances.at(-1)?.options).toMatchObject({
      type: 'event',
      buffered: true,
    });

    monitor.stopMonitoring();
    jest.advanceTimersByTime(5_000);
    monitor.startMonitoring();
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
      worstInteractionStartTime: null,
    });

    deliverEvents([eventEntry(400, 1, 1_000)]);
    expect(snapshots.at(-1)?.slowInteractionsCount).toBe(0);

    deliverEvents([eventEntry(220, 2, performance.now())]);
    expect(snapshots.at(-1)).toMatchObject({
      slowInteractionsCount: 1,
      worstInteractionDelay: 220,
    });
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
      worstInteractionStartTime: 1_000,
    });

    jest.advanceTimersByTime(29_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 180,
      slowInteractionsCount: 2,
      worstInteractionDelay: 180,
      lastInteractionDelay: 180,
      worstInteractionStartTime: 2_000,
    });

    jest.advanceTimersByTime(1_000);
    expect(snapshots.at(-1)).toEqual({
      currentINP: 0,
      slowInteractionsCount: 0,
      worstInteractionDelay: 0,
      lastInteractionDelay: 0,
      worstInteractionStartTime: null,
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
      worstInteractionStartTime: 0,
    });
  });

  it('uses only positive integer interaction IDs and preserves the absent-ID fallback', () => {
    deliverEvents([
      eventEntry(300, 7, 0, 'pointerdown'),
      eventEntry(250, 7, 1, 'click'),
      eventEntry(200, 0, 2, 'mousedown'),
      eventEntry(200, 0, 3, 'mouseup'),
    ]);
    expect(snapshots.at(-1)).toMatchObject({
      slowInteractionsCount: 1,
      worstInteractionDelay: 300,
      worstInteractionStartTime: 0,
    });

    deliverEvents([eventEntry(175, 8, 9)]);
    expect(snapshots.at(-1)?.slowInteractionsCount).toBe(2);

    deliverEvents([
      eventEntry(200, -1, 4),
      eventEntry(200, Number.NaN, 5),
      eventEntry(200, Number.POSITIVE_INFINITY, 6),
      eventEntry(200, 1.5, 7),
      eventEntry(150, undefined, 8),
    ]);
    expect(snapshots.at(-1)).toMatchObject({
      slowInteractionsCount: 3,
      worstInteractionDelay: 300,
      worstInteractionStartTime: 0,
    });
  });

  it('orders worst interaction metadata and falls back as interactions expire', () => {
    deliverEvents([eventEntry(400, 1, 0), eventEntry(400, 2, 1_000), eventEntry(300, 3, 2_000)]);
    expect(snapshots.at(-1)).toMatchObject({
      worstInteractionDelay: 400,
      worstInteractionStartTime: 1_000,
    });

    jest.advanceTimersByTime(31_000);
    expect(snapshots.at(-1)).toMatchObject({
      worstInteractionDelay: 300,
      worstInteractionStartTime: 2_000,
    });

    jest.advanceTimersByTime(1_000);
    expect(snapshots.at(-1)).toMatchObject({
      worstInteractionDelay: 0,
      worstInteractionStartTime: null,
    });
  });
});
