/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventEmitter } from 'events';
import { createCleanupBeforeExit } from './create_cleanup_before_exit';

const flushPromises = async () => {
  await new Promise<void>((resolve) => setImmediate(resolve));
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
    exit: jest.fn(function (this: NodeJS.Process, code?: number) {
      originalExit(code);
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
});
