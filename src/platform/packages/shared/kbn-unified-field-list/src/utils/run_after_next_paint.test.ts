/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { runAfterNextPaint } from './run_after_next_paint';

describe('runAfterNextPaint', () => {
  let nextFrameId = 1;
  const frameCallbacks = new Map<number, FrameRequestCallback>();

  beforeEach(() => {
    jest.useFakeTimers();
    frameCallbacks.clear();
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const frameId = nextFrameId++;
      frameCallbacks.set(frameId, callback);
      return frameId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((frameId) => {
      frameCallbacks.delete(frameId);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const runNextFrame = () => {
    const callbacks = Array.from(frameCallbacks.values());
    frameCallbacks.clear();
    callbacks.forEach((callback) => callback(performance.now()));
  };

  it('runs the callback only after the next frame has been painted', () => {
    const callback = jest.fn();

    runAfterNextPaint(callback);
    expect(callback).not.toHaveBeenCalled();

    // the frame callback runs right before the paint, so the callback must not run yet
    runNextFrame();
    expect(callback).not.toHaveBeenCalled();

    // the macrotask scheduled from the frame callback runs after the paint
    jest.runOnlyPendingTimers();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled before the next frame', () => {
    const callback = jest.fn();

    const cancel = runAfterNextPaint(callback);
    cancel();

    runNextFrame();
    jest.runOnlyPendingTimers();
    expect(callback).not.toHaveBeenCalled();
  });

  it('can be cancelled after the next frame but before the callback runs', () => {
    const callback = jest.fn();

    const cancel = runAfterNextPaint(callback);
    runNextFrame();
    cancel();

    jest.runOnlyPendingTimers();
    expect(callback).not.toHaveBeenCalled();
  });
});
