/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeSync } from 'node:fs';
import type { LogMeta } from '@kbn/logging';
import type * as WorkerThreads from 'node:worker_threads';
import { createWorkerLogger } from './worker_logger';
import type { WorkerLoggingConfig } from './worker_logger';

jest.mock('node:fs', () => ({ writeSync: jest.fn() }));
jest.mock('node:worker_threads', () => ({ isMainThread: false, threadId: 7 }));
const write = jest.mocked(writeSync);
const workerThreads = jest.requireMock<typeof WorkerThreads>('node:worker_threads');
interface TestMeta extends LogMeta {
  kibana: { a?: number; worker?: { name: string; thread_id: number } };
}
const config: WorkerLoggingConfig = {
  context: 'metrics.event_loop_watchdog',
  level: 'warn',
  format: 'json',
};
const line = () => String(write.mock.calls[0][1]);

describe('worker diagnostic logger', () => {
  beforeEach(() => {
    write.mockReset();
    jest.replaceProperty(workerThreads, 'isMainThread', false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('writes ECS JSON lines with the original meta and an automatic worker marker', () => {
    createWorkerLogger(config, 'watchdog', 42).warn<TestMeta>('msg', { kibana: { a: 1 } });
    expect(write).toHaveBeenCalledWith(42, expect.any(String));
    expect(line().endsWith('\n')).toBe(true);
    expect(JSON.parse(line())).toEqual({
      '@timestamp': expect.any(String),
      ecs: { version: expect.any(String) },
      log: { level: 'WARN', logger: config.context },
      message: 'msg',
      process: { pid: process.pid, uptime: expect.any(Number) },
      kibana: { a: 1, worker: { name: 'watchdog', thread_id: 7 } },
    });
  });

  it('writes standard text lines with a visible worker identity', () => {
    createWorkerLogger({ ...config, format: 'text' }, 'watchdog').warn('msg');
    expect(line()).toMatch(/\[WARN \]\[metrics.event_loop_watchdog\] \[worker:watchdog:7\] msg\n$/);
  });

  it('uses the same format without a worker marker on the main thread', () => {
    jest.replaceProperty(workerThreads, 'isMainThread', true);
    createWorkerLogger(config, 'watchdog').error(new Error('broken'));
    expect(JSON.parse(line())).toEqual(
      expect.objectContaining({
        message: 'broken',
        error: { type: 'Error', message: 'broken', stack_trace: expect.any(String) },
      })
    );
    expect(JSON.parse(line()).kibana).toBeUndefined();
  });

  it.each([
    ['off', 0],
    ['error', 1],
    ['warn', 2],
    ['debug', 3],
  ] as const)('honors %s level for each record', (level, count) => {
    const logger = createWorkerLogger({ ...config, level }, 'watchdog');
    logger.debug('ready');
    logger.warn('blocked');
    logger.error('failed');
    expect(write).toHaveBeenCalledTimes(count);
  });

  it('disables the sink without a console format', () => {
    createWorkerLogger({ ...config, format: undefined }, 'watchdog').error('msg');
    expect(write).not.toHaveBeenCalled();
  });

  it('does not allow call-site metadata to impersonate a different worker', () => {
    createWorkerLogger(config, 'watchdog').warn<TestMeta>('msg', {
      kibana: { worker: { name: 'fake', thread_id: 99 } },
    });
    expect(JSON.parse(line()).kibana.worker).toEqual({ name: 'watchdog', thread_id: 7 });
  });

  it('supports standard child loggers, enabled checks and lazy messages', () => {
    const logger = createWorkerLogger(config, 'watchdog').get('child');
    const message = jest.fn(() => 'lazy');
    expect(logger.isLevelEnabled('debug')).toBe(false);
    logger.debug(message);
    expect(message).not.toHaveBeenCalled();
    logger.warn(message);
    expect(message).toHaveBeenCalledTimes(1);
    expect(JSON.parse(line()).log.logger).toBe(`${config.context}.child`);
    expect(JSON.parse(line()).kibana.worker.thread_id).toBe(7);
  });

  it('contains output failures', () => {
    write.mockImplementation(() => {
      throw new Error('closed sink');
    });
    expect(() => createWorkerLogger(config, 'watchdog').warn('msg')).not.toThrow();
  });
});
