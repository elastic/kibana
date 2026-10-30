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
  kibana?: {
    a?: number;
    event_loop_watchdog?: { blockedMs: number };
    worker?: { name: string; thread_id: number };
  };
  service?: { version?: string; state?: string };
}

const service = {
  node: { roles: ['background_tasks', 'ui'] },
  version: '9.3.0',
  type: 'kibana',
} as const;

const config: WorkerLoggingConfig = {
  context: 'metrics.event_loop_watchdog',
  level: 'warn',
  format: 'json',
  service,
};

const writtenAt = (call: number) => String(write.mock.calls[call][1]);
const line = () => writtenAt(0);
const fsError = (code: string) => Object.assign(new Error(code), { code });
const writeAll = (_fd: number, buffer: NodeJS.ArrayBufferView) => buffer.byteLength;

describe('createWorkerLogger', () => {
  beforeEach(() => {
    write.mockReset();
    write.mockImplementation(writeAll as typeof writeSync);
    jest.replaceProperty(workerThreads, 'isMainThread', false);
  });
  afterEach(() => jest.restoreAllMocks());

  it('writes ECS JSON log lines with the service fields, the log line data and the worker marker', () => {
    createWorkerLogger(config, 'watchdog', 42).warn<TestMeta>('msg', { kibana: { a: 1 } });
    expect(write).toHaveBeenCalledWith(42, expect.any(Buffer));
    expect(line().endsWith('\n')).toBe(true);
    expect(JSON.parse(line())).toEqual({
      '@timestamp': expect.any(String),
      ecs: { version: expect.any(String) },
      log: { level: 'WARN', logger: config.context },
      message: 'msg',
      process: { pid: process.pid, uptime: expect.any(Number) },
      service: { node: { roles: ['background_tasks', 'ui'] }, version: '9.3.0', type: 'kibana' },
      kibana: { a: 1, worker: { name: 'watchdog', thread_id: 7 } },
    });
  });

  it('adds only the static service fields, so no service.state', () => {
    createWorkerLogger(config, 'watchdog').warn('msg');
    expect(JSON.parse(line()).service.state).toBeUndefined();
  });

  it('lets the log line data override a service field', () => {
    createWorkerLogger(config, 'watchdog').warn<TestMeta>('msg', { service: { version: 'x' } });
    expect(JSON.parse(line()).service).toEqual({ ...service, version: 'x' });
  });

  it('keeps kibana.event_loop_watchdog next to kibana.worker', () => {
    createWorkerLogger(config, 'watchdog').warn<TestMeta>('msg', {
      kibana: { event_loop_watchdog: { blockedMs: 300 } },
    });
    expect(JSON.parse(line()).kibana).toEqual({
      event_loop_watchdog: { blockedMs: 300 },
      worker: { name: 'watchdog', thread_id: 7 },
    });
  });

  it('writes standard text log lines with a visible worker identity', () => {
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

  it('writes nothing without a console format', () => {
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
    const logger = createWorkerLogger(config, 'watchdog').get('child', 'grandchild');
    const message = jest.fn(() => 'lazy');
    expect(logger.isLevelEnabled('debug')).toBe(false);
    logger.debug(message);
    expect(message).not.toHaveBeenCalled();
    logger.warn(message);
    expect(message).toHaveBeenCalledTimes(1);
    expect(JSON.parse(line()).log.logger).toBe(`${config.context}.child.grandchild`);
    expect(JSON.parse(line()).kibana.worker.thread_id).toBe(7);
  });

  describe('log line size', () => {
    it('writes a log line up to 4096 bytes, newline included, unchanged', () => {
      createWorkerLogger(config, 'watchdog').warn('a'.repeat(3000));
      expect(JSON.parse(line()).message).toBe('a'.repeat(3000));
    });

    it('drops the log line data and cuts the message when the log line is too long', () => {
      const logger = createWorkerLogger(config, 'watchdog');
      logger.warn<TestMeta>('m'.repeat(10_000), { kibana: { a: 1 } });
      const written = line();
      expect(Buffer.byteLength(written)).toBeLessThanOrEqual(4095);
      const parsed = JSON.parse(written);
      expect(parsed.message).toMatch(/^m+ \[truncated\]$/);
      expect(parsed.kibana).toEqual({ worker: { name: 'watchdog', thread_id: 7 } });
      expect(parsed.service).toEqual(service);
      expect(logger.getDroppedLogLineCount()).toBe(0);
    });

    it('keeps the log line within the limit when the data alone is too long', () => {
      createWorkerLogger(config, 'watchdog').warn<TestMeta>('msg', {
        kibana: { a: 1, event_loop_watchdog: { blockedMs: 1 } },
        big: 'x'.repeat(10_000),
      } as TestMeta);
      const parsed = JSON.parse(line());
      expect(parsed.message).toBe('msg [truncated]');
      expect(parsed.big).toBeUndefined();
    });

    it('does not leave a broken multi-byte character when cutting', () => {
      createWorkerLogger(config, 'watchdog').warn('€'.repeat(3000));
      expect(JSON.parse(line()).message).toMatch(/^€+ \[truncated\]$/);
    });

    it('cuts text log lines too', () => {
      createWorkerLogger({ ...config, format: 'text' }, 'watchdog').warn('t'.repeat(10_000));
      expect(Buffer.byteLength(line())).toBeLessThanOrEqual(4095);
      expect(line()).toMatch(/t \[truncated\]\n$/);
    });

    describe('at the 4094-byte boundary', () => {
      // Pin the variable parts of the JSON log line so its size depends only on the message.
      beforeEach(() => jest.spyOn(process, 'uptime').mockReturnValue(1));

      const messageForLogLineBytes = (bytes: number) => {
        createWorkerLogger(config, 'watchdog').warn('a');
        const overhead = Buffer.byteLength(line()) - 1 - 'a'.length;
        write.mockClear();
        return 'a'.repeat(bytes - overhead);
      };

      it('writes a 4094-byte log line unchanged', () => {
        const message = messageForLogLineBytes(4094);
        createWorkerLogger(config, 'watchdog').warn(message);
        expect(Buffer.byteLength(line())).toBe(4095);
        expect(JSON.parse(line()).message).toBe(message);
      });

      it('cuts a 4095-byte log line', () => {
        const message = messageForLogLineBytes(4095);
        createWorkerLogger(config, 'watchdog').warn(message);
        expect(Buffer.byteLength(line())).toBeLessThanOrEqual(4095);
        expect(JSON.parse(line()).message).toMatch(/ \[truncated\]$/);
      });

      it('keeps the write after a partial write within 4096 bytes', () => {
        const message = messageForLogLineBytes(4094);
        write.mockImplementationOnce(() => 10);
        const logger = createWorkerLogger(config, 'watchdog');
        logger.warn('first');
        logger.warn(message);
        expect(Buffer.byteLength(writtenAt(1))).toBe(4096);
        expect(JSON.parse(writtenAt(1).slice(1)).message).toBe(message);
      });
    });

    it('drops the error when its stack makes the log line too long', () => {
      const error = new Error('broken');
      error.stack = `Error: broken\n${'    at frame\n'.repeat(500)}`;
      createWorkerLogger(config, 'watchdog').error(error);
      const parsed = JSON.parse(line());
      expect(parsed.error).toBeUndefined();
      expect(parsed.message).toBe('broken [truncated]');
    });
  });

  describe('write failures', () => {
    it.each(['EAGAIN', 'EPIPE'])('swallows %s and counts the log line as dropped', (code) => {
      write.mockImplementation(() => {
        throw fsError(code);
      });
      const logger = createWorkerLogger(config, 'watchdog');
      expect(() => logger.warn('msg')).not.toThrow();
      expect(logger.getDroppedLogLineCount()).toBe(1);
    });

    it('swallows formatting errors and counts them', () => {
      const logger = createWorkerLogger(config, 'watchdog');
      const meta = { kibana: {} } as TestMeta & { self?: unknown };
      meta.self = meta;
      expect(() => logger.warn<TestMeta>('msg', meta)).not.toThrow();
      expect(logger.getDroppedLogLineCount()).toBe(1);
      expect(write).not.toHaveBeenCalled();
    });

    it('counts a partial write as dropped and starts the next write with a newline', () => {
      write.mockImplementationOnce(() => 10);
      const logger = createWorkerLogger(config, 'watchdog');
      logger.warn('first');
      logger.warn('second');
      logger.warn('third');
      expect(logger.getDroppedLogLineCount()).toBe(1);
      expect(writtenAt(1).startsWith('\n{')).toBe(true);
      expect(JSON.parse(writtenAt(1).slice(1)).message).toBe('second');
      expect(writtenAt(2).startsWith('{')).toBe(true);
    });

    it('does not count a log line whose trailing newline alone was not written', () => {
      write.mockImplementationOnce(
        ((_fd: number, buffer: NodeJS.ArrayBufferView) => buffer.byteLength - 1) as typeof writeSync
      );
      const logger = createWorkerLogger(config, 'watchdog');
      logger.warn('first');
      logger.warn('second');
      expect(logger.getDroppedLogLineCount()).toBe(0);
      expect(writtenAt(1).startsWith('\n{')).toBe(true);
    });

    it('keeps the pending newline until a write succeeds', () => {
      write
        .mockImplementationOnce(() => 10)
        .mockImplementationOnce(() => {
          throw fsError('EAGAIN');
        });
      const logger = createWorkerLogger(config, 'watchdog');
      logger.warn('first');
      logger.warn('second');
      logger.warn('third');
      expect(logger.getDroppedLogLineCount()).toBe(2);
      expect(writtenAt(2).startsWith('\n{')).toBe(true);
    });

    it('shares the count with child loggers', () => {
      write.mockImplementation(() => {
        throw fsError('EAGAIN');
      });
      const logger = createWorkerLogger(config, 'watchdog');
      logger.get('child').warn('msg');
      logger.warn('msg');
      expect(logger.getDroppedLogLineCount()).toBe(2);
    });
  });
});
