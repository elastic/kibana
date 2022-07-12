/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger } from '@kbn/logging';
import { LoggerAdapter } from './logger_adapter';

test('proxies all method calls to the internal logger.', () => {
  const internalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

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
});

test('forwards all method calls to new internal logger if it is updated.', () => {
  const oldInternalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

  const newInternalLogger: Logger = {
    debug: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    info: jest.fn(),
    log: jest.fn(),
    trace: jest.fn(),
    warn: jest.fn(),
    get: jest.fn(),
  };

  const adapter = new LoggerAdapter(oldInternalLogger);

  adapter.trace('trace-message');
  expect(oldInternalLogger.trace).toHaveBeenCalledTimes(1);
  expect(oldInternalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
  (oldInternalLogger.trace as jest.Mock<() => void>).mockReset();

  adapter.updateLogger(newInternalLogger);
  adapter.trace('trace-message');
  expect(oldInternalLogger.trace).not.toHaveBeenCalled();
  expect(newInternalLogger.trace).toHaveBeenCalledTimes(1);
  expect(newInternalLogger.trace).toHaveBeenCalledWith('trace-message', undefined);
});

describe('global meta', () => {
  let internalLogger: Logger;

  beforeEach(() => {
    internalLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      trace: jest.fn(),
      warn: jest.fn(),
      get: jest.fn(),
    };
  });

  afterEach(() => {
    Object.values(internalLogger).forEach((val) => (val as jest.Mock<() => void>).mockReset());
  });

  ['trace', 'debug', 'info', 'warn', 'error', 'fatal'].forEach((method) => {
    test(`inserts global meta in ${method} entries`, () => {
      const adapter = new LoggerAdapter(internalLogger, new Map([['a.b.c', `${method}: d`]]));

      // @ts-expect-error Custom ECS field
      adapter[method](`new ${method} message`, { hello: 'world' });
      expect(internalLogger[method as keyof Logger]).toHaveBeenCalledTimes(1);
      expect(internalLogger[method as keyof Logger]).toHaveBeenCalledWith(`new ${method} message`, {
        hello: 'world',
        a: { b: { c: `${method}: d` } },
      });

      adapter.setGlobalMeta(new Map([['e', true]]));

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
    const adapter = new LoggerAdapter(internalLogger, new Map([['a.b.c', 'd']]));

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

    adapter.setGlobalMeta(new Map([['e', true]]));

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
    const adapter = new LoggerAdapter(internalLogger, new Map([['hello', 'there']]));

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
    const adapter = new LoggerAdapter(internalLogger, new Map([['hello', 'there']]));

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
