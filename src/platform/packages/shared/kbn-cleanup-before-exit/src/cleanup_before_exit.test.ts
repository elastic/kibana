/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { diag } from '@opentelemetry/api';
import { createCleanupBeforeExit } from './create_cleanup_before_exit';

const flushPromises = async () => {
  await new Promise<void>((resolve) => process.nextTick(resolve));
};

const waitForTimers = async (ms = 5) => {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
};

type MockedProcess = NodeJS.Process & {
  exit: jest.Mock<void, [number?]>;
  kill: jest.Mock;
};

function createMockProc() {
  const emitter = new EventEmitter();
  const originalExit = jest.fn();

  const proc = Object.assign(emitter, {
    pid: 1234,
    exit: jest.fn(function (this: NodeJS.Process, ...args: any[]) {
      originalExit(...args);
    }),
    kill: jest.fn(),
  }) as unknown as MockedProcess;

  return { proc, originalExit };
}

describe('createCleanupBeforeExit', () => {
  it('invokes cleanup handler when beforeExit is emitted', async () => {
    const { proc } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    const handler = jest.fn();

    cleanupBeforeExit(handler);

    proc.emit('beforeExit', 0);
    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('waits for blocking handlers before exiting', async () => {
    const { proc, originalExit } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    let resolveHandler: (() => void) | undefined;

    const handler = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveHandler = resolve;
        })
    );

    cleanupBeforeExit(handler, { blockExit: true });

    proc.exit(1);
    await Promise.resolve();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(resolveHandler).toBeDefined();
    expect(originalExit).not.toHaveBeenCalled();

    resolveHandler!();
    await flushPromises();

    expect(originalExit).toHaveBeenCalledWith(1);
  });

  it('does not block exit when handler is non-blocking', () => {
    const { proc, originalExit } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    const handler = jest.fn();

    cleanupBeforeExit(handler);

    proc.exit(0);

    expect(originalExit).toHaveBeenCalledWith(0);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not override an existing process.exitCode', () => {
    const { proc, originalExit } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    const handler = jest.fn();

    proc.exitCode = 1;

    cleanupBeforeExit(handler);

    proc.exit();

    expect(originalExit).toHaveBeenCalled();

    expect(originalExit.mock.lastCall.length).toBe(0);
  });

  it('only runs cleanup once for multiple signals', async () => {
    const { proc } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    const handler = jest.fn();

    cleanupBeforeExit(handler);

    proc.emit('SIGINT');
    await flushPromises();
    proc.emit('SIGTERM');
    await flushPromises();

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('allows unregistering handlers', async () => {
    const { proc } = createMockProc();
    const cleanupBeforeExit = createCleanupBeforeExit(proc);
    const handlerA = jest.fn();
    const handlerB = jest.fn();

    const removeA = cleanupBeforeExit(handlerA);
    cleanupBeforeExit(handlerB);

    removeA();

    proc.emit('beforeExit', 0);

    await flushPromises();

    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalledTimes(1);
  });

  it('logs a timeout warning when a blocking handler exceeds its timeout', async () => {
    const warnSpy = jest.spyOn(diag, 'warn').mockImplementation(() => {});

    try {
      const { proc } = createMockProc();
      const cleanupBeforeExit = createCleanupBeforeExit(proc);

      cleanupBeforeExit(() => new Promise(() => {}), { blockExit: true, timeout: 1 });

      proc.emit('beforeExit', 0);
      await flushPromises();
      await waitForTimers();
      await flushPromises();

      expect(warnSpy).toHaveBeenCalled();
      const warningMessage = String(warnSpy.mock.calls.at(-1)?.[0] ?? '');
      expect(warningMessage).toContain('Timeout');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('logs an error when a non-blocking handler outlives process.exit', async () => {
    const warnSpy = jest.spyOn(diag, 'warn').mockImplementation(() => {});

    jest.useFakeTimers();

    try {
      const { proc, originalExit } = createMockProc();
      const cleanupBeforeExit = createCleanupBeforeExit(proc);

      cleanupBeforeExit(() => new Promise(() => {}), { timeout: 1000, blockExit: false });
      cleanupBeforeExit(() => new Promise(() => {}), { timeout: 1000, blockExit: true });

      proc.emit('beforeExit', 0);

      proc.exit(0);

      await jest.advanceTimersToNextTimerAsync();

      expect(warnSpy).toHaveBeenCalled();

      expect(originalExit).toHaveBeenCalled();

      const messages = warnSpy.mock.calls.map(([error]) => String(error));

      expect(messages.some((message) => message.includes('Process exited'))).toBe(true);
    } finally {
      warnSpy.mockRestore();
      jest.useRealTimers();
    }
  });
});
