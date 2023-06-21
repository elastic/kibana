/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mockStreamWrite, mockGetFlattenedObject } from './logging_system.test.mocks';

const dynamicProps = { process: { pid: expect.any(Number) }, ecs: { version: EcsVersion } };

const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 33, 22, 11));
let mockConsoleLog: jest.SpyInstance;

import { createWriteStream } from 'fs';
const mockCreateWriteStream = createWriteStream as unknown as jest.Mock<typeof createWriteStream>;

import { LoggingSystem, config } from '..';
import { EcsVersion } from '@kbn/ecs';

let system: LoggingSystem;
beforeEach(() => {
  mockConsoleLog = jest.spyOn(global.console, 'log').mockReturnValue(undefined);
  jest.spyOn<any, any>(global, 'Date').mockImplementation(() => timestamp);
  system = new LoggingSystem();
});

afterEach(() => {
  jest.restoreAllMocks();
  mockCreateWriteStream.mockClear();
  mockStreamWrite.mockClear();
  mockGetFlattenedObject.mockClear();
});

test('uses default memory buffer logger until config is provided', () => {
  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  const logger = system.get('test', 'context');
  logger.trace('trace message');

  // We shouldn't create new buffer appender for another context name.
  const anotherLogger = system.get('test', 'context2');
  // @ts-expect-error ECS custom meta
  anotherLogger.fatal('fatal message', { some: 'value' });

  expect(bufferAppendSpy).toHaveBeenCalledTimes(2);

  // pid at args level, nested under process for ECS writes
  expect(bufferAppendSpy.mock.calls[0][0]).toMatchSnapshot({ pid: expect.any(Number) });
  expect(bufferAppendSpy.mock.calls[1][0]).toMatchSnapshot({ pid: expect.any(Number) });
});

test('flushes memory buffer logger and switches to real logger once config is provided', async () => {
  const logger = system.get('test', 'context');

  logger.trace('buffered trace message');
  // @ts-expect-error ECS custom meta
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  // Switch to console appender with `info` level, so that `trace` message won't go through.
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchSnapshot(
    dynamicProps,
    'buffered messages'
  );
  mockConsoleLog.mockClear();

  // Now message should go straight to thew newly configured appender, not buffered one.
  logger.info('some new info message');
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchSnapshot(dynamicProps, 'new messages');
  expect(bufferAppendSpy).not.toHaveBeenCalled();
});

test('appends records via multiple appenders.', async () => {
  const loggerWithoutConfig = system.get('some-context');
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');

  loggerWithoutConfig.info('You know, just for your info.');
  testsLogger.warn('Config is not ready!');
  testsChildLogger.error('Too bad that config is not ready :/');
  testsChildLogger.info('Just some info that should not be logged.');

  expect(mockConsoleLog).not.toHaveBeenCalled();
  expect(mockCreateWriteStream).not.toHaveBeenCalled();

  await system.upgrade(
    config.schema.validate({
      appenders: {
        default: { type: 'console', layout: { type: 'pattern' } },
        file: { type: 'file', layout: { type: 'pattern' }, fileName: 'path' },
      },
      loggers: [
        { appenders: ['file'], name: 'tests', level: 'warn' },
        { name: 'tests.child', level: 'error' },
      ],
    })
  );

  // Now all logs should added to configured appenders.
  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog.mock.calls[0][0]).toMatchSnapshot('console logs');

  expect(mockStreamWrite).toHaveBeenCalledTimes(2);
  expect(mockStreamWrite.mock.calls[0][0]).toMatchSnapshot('file logs');
  expect(mockStreamWrite.mock.calls[1][0]).toMatchSnapshot('file logs');
});

test('uses `root` logger if context name is not specified.', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'pattern' } } },
    })
  );

  const rootLogger = system.get();
  rootLogger.info('This message goes to a root context.');

  expect(mockConsoleLog.mock.calls).toMatchSnapshot();
});

test('attaches appenders to appenders that declare refs', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: {
        console: {
          type: 'console',
          layout: { type: 'pattern', pattern: '[%logger] %message %meta' },
        },
        file: {
          type: 'file',
          layout: { type: 'pattern', pattern: '[%logger] %message %meta' },
          fileName: 'path',
        },
        rewrite: {
          type: 'rewrite',
          appenders: ['console', 'file'],
          policy: { type: 'meta', mode: 'remove', properties: [{ path: 'b' }] },
        },
      },
      loggers: [{ name: 'tests', level: 'warn', appenders: ['rewrite'] }],
    })
  );

  const testLogger = system.get('tests');
  // @ts-expect-error ECS custom meta
  testLogger.warn('This message goes to a test context.', { a: 'hi', b: 'remove me' });

  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog.mock.calls[0][0]).toMatchInlineSnapshot(
    `"[tests] This message goes to a test context. {\\"a\\":\\"hi\\"}"`
  );

  expect(mockStreamWrite).toHaveBeenCalledTimes(1);
  expect(mockStreamWrite.mock.calls[0][0]).toMatchInlineSnapshot(`
    "[tests] This message goes to a test context. {\\"a\\":\\"hi\\"}
    "
  `);
});

test('throws if a circular appender reference is detected', async () => {
  expect(async () => {
    await system.upgrade(
      config.schema.validate({
        appenders: {
          console: { type: 'console', layout: { type: 'pattern' } },
          a: {
            type: 'rewrite',
            appenders: ['b'],
            policy: { type: 'meta', mode: 'remove', properties: [{ path: 'b' }] },
          },
          b: {
            type: 'rewrite',
            appenders: ['c'],
            policy: { type: 'meta', mode: 'remove', properties: [{ path: 'b' }] },
          },
          c: {
            type: 'rewrite',
            appenders: ['console', 'a'],
            policy: { type: 'meta', mode: 'remove', properties: [{ path: 'b' }] },
          },
        },
        loggers: [{ name: 'tests', level: 'warn', appenders: ['a'] }],
      })
    );
  }).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Circular appender reference detected: [b -> c -> a -> b]"`
  );

  expect(mockConsoleLog).toHaveBeenCalledTimes(0);
});

test('`stop()` disposes all appenders.', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  const bufferDisposeSpy = jest.spyOn((system as any).bufferAppender, 'dispose');
  const consoleDisposeSpy = jest.spyOn((system as any).appenders.get('default'), 'dispose');

  await system.stop();

  expect(bufferDisposeSpy).toHaveBeenCalledTimes(1);
  expect(consoleDisposeSpy).toHaveBeenCalledTimes(1);
});

test('asLoggerFactory() only allows to create new loggers.', async () => {
  const logger = system.asLoggerFactory().get('test', 'context');

  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'all' },
    })
  );

  logger.trace('buffered trace message');
  // @ts-expect-error ECS custom meta
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  expect(Object.keys(system.asLoggerFactory())).toEqual(['get']);

  expect(mockConsoleLog).toHaveBeenCalledTimes(3);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchSnapshot(dynamicProps);
  expect(JSON.parse(mockConsoleLog.mock.calls[1][0])).toMatchSnapshot(dynamicProps);
  expect(JSON.parse(mockConsoleLog.mock.calls[2][0])).toMatchSnapshot(dynamicProps);
});

test('setContextConfig() updates config with relative contexts', async () => {
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');
  const testsGrandchildLogger = system.get('tests', 'child', 'grandchild');

  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { type: 'console', layout: { type: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ name: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  testsLogger.warn('tests log to default!');
  testsChildLogger.error('tests.child log to default!');
  testsGrandchildLogger.debug('tests.child.grandchild log to default and custom!');

  expect(mockConsoleLog).toHaveBeenCalledTimes(4);
  // Parent contexts are unaffected
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    message: 'tests log to default!',
    log: {
      level: 'WARN',
      logger: 'tests',
    },
  });
  expect(JSON.parse(mockConsoleLog.mock.calls[1][0])).toMatchObject({
    message: 'tests.child log to default!',
    log: {
      level: 'ERROR',
      logger: 'tests.child',
    },
  });
  // Customized context is logged in both appender formats
  expect(JSON.parse(mockConsoleLog.mock.calls[2][0])).toMatchObject({
    message: 'tests.child.grandchild log to default and custom!',
    log: {
      level: 'DEBUG',
      logger: 'tests.child.grandchild',
    },
  });
  expect(mockConsoleLog.mock.calls[3][0]).toMatchInlineSnapshot(
    `"[DEBUG][tests.child.grandchild] tests.child.grandchild log to default and custom!"`
  );
});

test('setContextConfig() updates config for a root context', async () => {
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');
  const testsGrandchildLogger = system.get('tests', 'child', 'grandchild');

  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { type: 'console', layout: { type: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ name: '', appenders: ['custom'], level: 'debug' }],
  });

  testsLogger.warn('tests log to default!');
  testsChildLogger.error('tests.child log to custom!');
  testsGrandchildLogger.debug('tests.child.grandchild log to custom!');

  expect(mockConsoleLog).toHaveBeenCalledTimes(3);
  // Parent context is unaffected
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    message: 'tests log to default!',
    log: {
      level: 'WARN',
      logger: 'tests',
    },
  });
  // Customized contexts
  expect(mockConsoleLog.mock.calls[1][0]).toMatchInlineSnapshot(
    `"[ERROR][tests.child] tests.child log to custom!"`
  );

  expect(mockConsoleLog.mock.calls[2][0]).toMatchInlineSnapshot(
    `"[DEBUG][tests.child.grandchild] tests.child.grandchild log to custom!"`
  );
});

test('custom context name configs are applied on subsequent calls to update()', async () => {
  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { type: 'console', layout: { type: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ name: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Calling upgrade after setContextConfig should not throw away the context-specific config
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  system
    .get('tests', 'child', 'grandchild')
    .debug('tests.child.grandchild log to default and custom!');

  // Customized context is logged in both appender formats still
  expect(mockConsoleLog).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    message: 'tests.child.grandchild log to default and custom!',
    log: {
      level: 'DEBUG',
      logger: 'tests.child.grandchild',
    },
  });
  expect(mockConsoleLog.mock.calls[1][0]).toMatchInlineSnapshot(
    `"[DEBUG][tests.child.grandchild] tests.child.grandchild log to default and custom!"`
  );
});

test('subsequent calls to setContextConfig() for the same context name override the previous config', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { type: 'console', layout: { type: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ name: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Call again, this time with level: 'warn' and a different pattern
  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        {
          type: 'console',
          layout: { type: 'pattern', pattern: '[%level][%logger] second pattern! %message' },
        },
      ],
    ]),
    loggers: [{ name: 'grandchild', appenders: ['default', 'custom'], level: 'warn' }],
  });

  const logger = system.get('tests', 'child', 'grandchild');
  logger.debug('this should not show anywhere!');
  logger.warn('tests.child.grandchild log to default and custom!');

  // Only the warn log should have been logged
  expect(mockConsoleLog).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    message: 'tests.child.grandchild log to default and custom!',
    log: {
      level: 'WARN',
      logger: 'tests.child.grandchild',
    },
  });
  expect(mockConsoleLog.mock.calls[1][0]).toMatchInlineSnapshot(
    `"[WARN ][tests.child.grandchild] second pattern! tests.child.grandchild log to default and custom!"`
  );
});

test('subsequent calls to setContextConfig() for the same context name can disable the previous config', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  await system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { type: 'console', layout: { type: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ name: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Call again, this time no customizations (effectively disabling)
  await system.setContextConfig(['tests', 'child'], {});

  const logger = system.get('tests', 'child', 'grandchild');
  logger.debug('this should not show anywhere!');
  logger.warn('tests.child.grandchild log to default!');

  // Only the warn log should have been logged once on the default appender
  expect(mockConsoleLog).toHaveBeenCalledTimes(1);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    message: 'tests.child.grandchild log to default!',
    log: {
      level: 'WARN',
      logger: 'tests.child.grandchild',
    },
  });
});

test('buffers log records for already created appenders', async () => {
  // a default config
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  const logger = system.get('test', 'context');

  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  const upgradePromise = system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'all' },
    })
  );

  logger.trace('message to the known context');
  expect(bufferAppendSpy).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledTimes(0);

  await upgradePromise;
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0]).message).toBe('message to the known context');
});

test('buffers log records for appenders created during config upgrade', async () => {
  // a default config
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  const upgradePromise = system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'all' },
    })
  );

  const logger = system.get('test', 'context');
  logger.trace('message to a new context');

  expect(bufferAppendSpy).toHaveBeenCalledTimes(1);
  expect(mockConsoleLog).toHaveBeenCalledTimes(0);

  await upgradePromise;
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0]).message).toBe('message to a new context');
});

test('setGlobalContext() applies meta to new and existing loggers', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  const existingLogger = system.get('some-existing-context');
  // @ts-expect-error Custom ECS field
  system.setGlobalContext({ a: { b: { c: true } } });
  const newLogger = system.get('some-new-context');

  existingLogger.info('You know, just for your info.');
  newLogger.info('You know, just for your info.');
  // @ts-expect-error Custom ECS field
  existingLogger.warn('You have been warned.', { someMeta: 'goes here' });
  // @ts-expect-error Custom ECS field
  newLogger.warn('You have been warned.', { someMeta: 'goes here' });

  expect(mockConsoleLog).toHaveBeenCalledTimes(4);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    log: { logger: 'some-existing-context' },
    message: 'You know, just for your info.',
    a: { b: { c: true } },
  });
  expect(JSON.parse(mockConsoleLog.mock.calls[1][0])).toMatchObject({
    log: { logger: 'some-new-context' },
    message: 'You know, just for your info.',
    a: { b: { c: true } },
  });
  expect(JSON.parse(mockConsoleLog.mock.calls[2][0])).toMatchObject({
    log: { logger: 'some-existing-context' },
    message: 'You have been warned.',
    someMeta: 'goes here',
    a: { b: { c: true } },
  });
  expect(JSON.parse(mockConsoleLog.mock.calls[3][0])).toMatchObject({
    log: { logger: 'some-new-context' },
    message: 'You have been warned.',
    someMeta: 'goes here',
    a: { b: { c: true } },
  });
});

test('new global context always overwrites existing context', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  const logger = system.get('some-context');

  // @ts-expect-error Custom ECS field
  system.setGlobalContext({ a: { b: { c: true } }, d: false });
  logger.info('You know, just for your info.');

  // @ts-expect-error Custom ECS field
  system.setGlobalContext({ a: false, d: true });
  logger.info('You know, just for your info, again.');

  expect(mockConsoleLog).toHaveBeenCalledTimes(2);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
    log: { logger: 'some-context' },
    message: 'You know, just for your info.',
    a: { b: { c: true } },
    d: false,
  });
  expect(JSON.parse(mockConsoleLog.mock.calls[1][0])).toMatchObject({
    log: { logger: 'some-context' },
    message: 'You know, just for your info, again.',
    a: false,
    d: true,
  });
});

test('flattens global context objects before passing to LoggerAdapter', async () => {
  await system.upgrade(
    config.schema.validate({
      appenders: { default: { type: 'console', layout: { type: 'json' } } },
      root: { level: 'info' },
    })
  );

  // @ts-expect-error Custom ECS field
  system.setGlobalContext({ a: { b: { c: true } }, d: false });

  const logger = system.get('some-context');

  // @ts-expect-error Custom ECS field
  system.setGlobalContext({ d: true, e: false });

  logger.info('You know, just for your info.');

  expect(mockGetFlattenedObject).toHaveBeenCalledTimes(3);
  expect(mockGetFlattenedObject.mock.calls[0][0]).toEqual({
    a: { b: { c: true } },
    d: false,
  });
  expect(mockGetFlattenedObject.mock.calls[1][0]).toEqual({
    a: { b: { c: true } },
    d: false,
  });
  expect(mockGetFlattenedObject.mock.calls[2][0]).toEqual({
    a: { b: { c: true } },
    d: true,
    e: false,
  });
});
