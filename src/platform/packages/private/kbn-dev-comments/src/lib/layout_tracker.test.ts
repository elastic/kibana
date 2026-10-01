/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createLayoutTracker } from './layout_tracker';

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observed = new Set<Element>();
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.add(element);
    // Browsers report every element once right after `observe`.
    this.report(element);
  }
  unobserve(element: Element) {
    this.observed.delete(element);
  }
  disconnect() {
    this.observed.clear();
  }
  report(target: Element) {
    this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

describe('createLayoutTracker', () => {
  const flushFrame = () => jest.advanceTimersByTime(20);

  beforeEach(() => {
    jest.useFakeTimers();
    FakeResizeObserver.instances = [];
    Object.assign(globalThis, { ResizeObserver: FakeResizeObserver });
  });

  afterEach(() => {
    jest.useRealTimers();
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  });

  it('installs one set of observers for all subscribers and removes it with the last one', () => {
    const tracker = createLayoutTracker();
    const observe = jest.spyOn(MutationObserver.prototype, 'observe');
    const disconnect = jest.spyOn(MutationObserver.prototype, 'disconnect');
    const first = jest.fn();
    const second = jest.fn();

    const unsubscribeFirst = tracker.subscribe(first);
    const unsubscribeSecond = tracker.subscribe(second);
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    flushFrame();

    expect(observe).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    expect(tracker.getTick()).toBe(1);

    unsubscribeFirst();
    expect(disconnect).not.toHaveBeenCalled();
    unsubscribeSecond();
    expect(disconnect).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('scroll'));
    flushFrame();
    expect(tracker.getTick()).toBe(1);
  });

  it('notifies on changes to the attributes and text anchors resolve by, and to layout, but not on others', async () => {
    const tracker = createLayoutTracker();
    const listener = jest.fn();
    const element = document.createElement('button');
    element.textContent = 'Loading';
    document.body.appendChild(element);
    const unsubscribe = tracker.subscribe(listener);
    await Promise.resolve();
    flushFrame();

    const notifications = async (change: () => void) => {
      listener.mockClear();
      change();
      // Mutation records are delivered on a microtask.
      await Promise.resolve();
      flushFrame();
      return listener.mock.calls.length;
    };

    expect(await notifications(() => element.setAttribute('id', 'late'))).toBe(1);
    expect(await notifications(() => element.setAttribute('data-test-subj', 'late'))).toBe(1);
    expect(await notifications(() => element.setAttribute('aria-label', 'Late'))).toBe(1);
    expect(await notifications(() => (element.firstChild!.nodeValue = 'Late'))).toBe(1);
    expect(await notifications(() => element.setAttribute('hidden', ''))).toBe(1);
    expect(await notifications(() => element.setAttribute('title', 'Late'))).toBe(0);
    unsubscribe();
  });

  it('notifies when a watched element changes size, but not for the report that follows observing it', () => {
    const tracker = createLayoutTracker();
    const listener = jest.fn();
    const element = document.createElement('div');
    document.body.appendChild(element);

    const unsubscribe = tracker.subscribe(listener);
    tracker.watch([element]);
    flushFrame();
    expect(listener).not.toHaveBeenCalled();

    const [observer] = FakeResizeObserver.instances;
    observer.report(element);
    flushFrame();
    expect(listener).toHaveBeenCalledTimes(1);

    tracker.watch([]);
    expect(observer.observed.has(element)).toBe(false);
    unsubscribe();
  });
});
