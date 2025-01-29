/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { LoggerAdapter } from './logger_adapter';

describe('LoggerAdapter', () => {
  let internalLogger: MockedLogger;

  beforeEach(() => {
    internalLogger = loggerMock.create();
  });

  test('proxies all method calls to the internal logger.', () => {
    const adapter = new LoggerAdapter(internalLogger);

    adapter.trace('trace-message');
    expect(internalLogger.trace).toHaveBeenCalledTimes(1);
    expect(internalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);

    adapter.debug('debug-message');
    expect(internalLogger.debug).toHaveBeenCalledTimes(1);
    expect(internalLogger.debug).toHaveBeenCalledWith('debug-message', undefined);

    adapter.info('info-message');
    expect(internalLogger.info).toHaveBeenCalledTimes(1);
    expect(internalLogger.info).toHaveBeenCalledWith('info-message', undefined);

    adapter.warn('warn-message');
    expect(internalLogger.warn).toHaveBeenCalledTimes(1);
    expect(internalLogger.warn).toHaveBeenCalledWith('warn-message', undefined);

    adapter.error('error-message');
    expect(internalLogger.error).toHaveBeenCalledTimes(1);
    expect(internalLogger.error).toHaveBeenCalledWith('error-message', undefined);

    adapter.fatal('fatal-message');
    expect(internalLogger.fatal).toHaveBeenCalledTimes(1);
    expect(internalLogger.fatal).toHaveBeenCalledWith('fatal-message', undefined);

    adapter.get('context');
    expect(internalLogger.get).toHaveBeenCalledTimes(1);
    expect(internalLogger.get).toHaveBeenCalledWith('context');

    internalLogger.isLevelEnabled.mockReturnValue(false);
    expect(adapter.isLevelEnabled('info')).toEqual(false);
    expect(internalLogger.isLevelEnabled).toHaveBeenCalledTimes(1);
    expect(internalLogger.isLevelEnabled).toHaveBeenCalledWith('info');
  });

  test('forwards all method calls to new internal logger if it is updated.', () => {
    const newInternalLogger = loggerMock.create();

    const adapter = new LoggerAdapter(internalLogger);

    adapter.trace('trace-message');
    expect(internalLogger.trace).toHaveBeenCalledTimes(1);
    expect(internalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
    internalLogger.trace.mockReset();

    adapter.updateLogger(newInternalLogger);
    adapter.trace('trace-message');
    expect(internalLogger.trace).not.toHaveBeenCalled();
    expect(newInternalLogger.trace).toHaveBeenCalledTimes(1);
    expect(newInternalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
  });

  describe('global context', () => {
    ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((method) => {
      test(`inserts global context in ${method} entries`, () => {
        const adapter = new LoggerAdapter(internalLogger, { 'a.b.c': `${method}: d` });

        // @ts-expect-error Custom ECS field
        adapter[method](`new ${method} message`, { hello: 'world' });
        expect(internalLogger[method as keyof Logger]).toHaveBeenCalledTimes(1);
        expect(internalLogger[method as keyof Logger]).toHaveBeenCalledWith(
          `new ${method} message`,
          {
            hello: 'world',
            a: { b: { c: `${method}: d` } },
          }
        );

        adapter.updateGlobalContext({ e: true });

        // @ts-expect-error Custom ECS field
        adapter[method](`another new ${method} message`, { hello: 'world' });
        expect(internalLogger[method as keyof Logger]).toHaveBeenCalledTimes(2);
        expect(internalLogger[method as keyof Logger]).toHaveBeenCalledWith(
          `another new ${method} message`,
          {
            hello: 'world',
            e: true,
          }
        );
      });
    });

    test('inserts global meta in log entries', () => {
      const adapter = new LoggerAdapter(internalLogger, { 'a.b.c': 'd' });

      adapter.log({
        message: 'message',
        meta: {
          // @ts-expect-error Custom ECS field
          hello: 'world',
        },
      });
      expect(internalLogger.log).toHaveBeenCalledTimes(1);
      expect(internalLogger.log).toHaveBeenCalledWith({
        message: 'message',
        meta: {
          hello: 'world',
          a: { b: { c: 'd' } },
        },
      });

      adapter.updateGlobalContext({ e: true });

      adapter.log({
        message: 'another message',
        meta: {
          // @ts-expect-error Custom ECS field
          hello: 'world',
        },
      });
      expect(internalLogger.log).toHaveBeenCalledTimes(2);
      expect(internalLogger.log).toHaveBeenCalledWith({
        message: 'another message',
        meta: {
          hello: 'world',
          e: true,
        },
      });
    });

    test('does not overwrite user-provided meta with global meta if the path already exists', () => {
      const adapter = new LoggerAdapter(internalLogger, { hello: 'there' });

      // @ts-expect-error Custom ECS field
      adapter.info('message', { hello: 'world' });
      expect(internalLogger.info).toHaveBeenCalledTimes(1);
      expect(internalLogger.info).toHaveBeenCalledWith('message', {
        hello: 'world',
      });
    });

    test('does nothing if no global meta has been set', () => {
      const adapter = new LoggerAdapter(internalLogger);

      // @ts-expect-error Custom ECS field
      adapter.info('message', { hello: 'world' });
      expect(internalLogger.info).toHaveBeenCalledTimes(1);
      expect(internalLogger.info).toHaveBeenCalledWith('message', {
        hello: 'world',
      });
    });

    test('adds global meta even if no user-provided meta exists', () => {
      const adapter = new LoggerAdapter(internalLogger, { hello: 'there' });

      adapter.info('message');
      expect(internalLogger.info).toHaveBeenCalledTimes(1);
      expect(internalLogger.info).toHaveBeenCalledWith('message', {
        hello: 'there',
      });
    });

    test('does nothing if no global meta or user-provided meta has been set', () => {
      const adapter = new LoggerAdapter(internalLogger);

      adapter.info('message');
      expect(internalLogger.info).toHaveBeenCalledTimes(1);
      expect(internalLogger.info).toHaveBeenCalledWith('message', undefined);
    });
  });
});
