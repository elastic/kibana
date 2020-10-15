/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const mockStreamWrite = jest.fn();
jest.mock('fs', () => ({
  constants: {},
  createWriteStream: jest.fn(() => ({ write: mockStreamWrite })),
}));

const dynamicProps = { process: { pid: expect.any(Number) } };

jest.mock('../../../legacy/server/logging/rotate', () => ({
  setupLoggingRotate: jest.fn().mockImplementation(() => Promise.resolve({})),
}));

const timestamp = new Date(Date.UTC(2012, 1, 1, 14, 33, 22, 11));
let mockConsoleLog: jest.SpyInstance;

import { createWriteStream } from 'fs';
const mockCreateWriteStream = (createWriteStream as unknown) as jest.Mock<typeof createWriteStream>;

import { LoggingSystem, config } from '.';

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
});

test('uses default memory buffer logger until config is provided', () => {
  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  const logger = system.get('test', 'context');
  logger.trace('trace message');

  // We shouldn't create new buffer appender for another context.
  const anotherLogger = system.get('test', 'context2');
  anotherLogger.fatal('fatal message', { some: 'value' });

  expect(bufferAppendSpy).toHaveBeenCalledTimes(2);

  // pid at args level, nested under process for ECS writes
  expect(bufferAppendSpy.mock.calls[0][0]).toMatchSnapshot({ pid: expect.any(Number) });
  expect(bufferAppendSpy.mock.calls[1][0]).toMatchSnapshot({ pid: expect.any(Number) });
});

test('flushes memory buffer logger and switches to real logger once config is provided', () => {
  const logger = system.get('test', 'context');

  logger.trace('buffered trace message');
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  const bufferAppendSpy = jest.spyOn((system as any).bufferAppender, 'append');

  // Switch to console appender with `info` level, so that `trace` message won't go through.
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
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

test('appends records via multiple appenders.', () => {
  const loggerWithoutConfig = system.get('some-context');
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');

  loggerWithoutConfig.info('You know, just for your info.');
  testsLogger.warn('Config is not ready!');
  testsChildLogger.error('Too bad that config is not ready :/');
  testsChildLogger.info('Just some info that should not be logged.');

  expect(mockConsoleLog).not.toHaveBeenCalled();
  expect(mockCreateWriteStream).not.toHaveBeenCalled();

  system.upgrade(
    config.schema.validate({
      appenders: {
        default: { kind: 'console', layout: { kind: 'pattern' } },
        file: { kind: 'file', layout: { kind: 'pattern' }, path: 'path' },
      },
      loggers: [
        { appenders: ['file'], context: 'tests', level: 'warn' },
        { context: 'tests.child', level: 'error' },
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

test('uses `root` logger if context is not specified.', () => {
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'pattern' } } },
    })
  );

  const rootLogger = system.get();
  rootLogger.info('This message goes to a root context.');

  expect(mockConsoleLog.mock.calls).toMatchSnapshot();
});

test('`stop()` disposes all appenders.', async () => {
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  const bufferDisposeSpy = jest.spyOn((system as any).bufferAppender, 'dispose');
  const consoleDisposeSpy = jest.spyOn((system as any).appenders.get('default'), 'dispose');

  await system.stop();

  expect(bufferDisposeSpy).toHaveBeenCalledTimes(1);
  expect(consoleDisposeSpy).toHaveBeenCalledTimes(1);
});

test('asLoggerFactory() only allows to create new loggers.', () => {
  const logger = system.asLoggerFactory().get('test', 'context');

  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'all' },
    })
  );

  logger.trace('buffered trace message');
  logger.info('buffered info message', { some: 'value' });
  logger.fatal('buffered fatal message');

  expect(Object.keys(system.asLoggerFactory())).toEqual(['get']);

  expect(mockConsoleLog).toHaveBeenCalledTimes(3);
  expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchSnapshot(dynamicProps);
  expect(JSON.parse(mockConsoleLog.mock.calls[1][0])).toMatchSnapshot(dynamicProps);
  expect(JSON.parse(mockConsoleLog.mock.calls[2][0])).toMatchSnapshot(dynamicProps);
});

test('setContextConfig() updates config with relative contexts', () => {
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');
  const testsGrandchildLogger = system.get('tests', 'child', 'grandchild');

  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { kind: 'console', layout: { kind: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ context: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
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

test('setContextConfig() updates config for a root context', () => {
  const testsLogger = system.get('tests');
  const testsChildLogger = system.get('tests', 'child');
  const testsGrandchildLogger = system.get('tests', 'child', 'grandchild');

  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { kind: 'console', layout: { kind: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ context: '', appenders: ['custom'], level: 'debug' }],
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

test('custom context configs are applied on subsequent calls to update()', () => {
  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { kind: 'console', layout: { kind: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ context: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Calling upgrade after setContextConfig should not throw away the context-specific config
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
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

test('subsequent calls to setContextConfig() for the same context override the previous config', () => {
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { kind: 'console', layout: { kind: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ context: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Call again, this time with level: 'warn' and a different pattern
  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        {
          kind: 'console',
          layout: { kind: 'pattern', pattern: '[%level][%logger] second pattern! %message' },
        },
      ],
    ]),
    loggers: [{ context: 'grandchild', appenders: ['default', 'custom'], level: 'warn' }],
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

test('subsequent calls to setContextConfig() for the same context can disable the previous config', () => {
  system.upgrade(
    config.schema.validate({
      appenders: { default: { kind: 'console', layout: { kind: 'json' } } },
      root: { level: 'info' },
    })
  );

  system.setContextConfig(['tests', 'child'], {
    appenders: new Map([
      [
        'custom',
        { kind: 'console', layout: { kind: 'pattern', pattern: '[%level][%logger] %message' } },
      ],
    ]),
    loggers: [{ context: 'grandchild', appenders: ['default', 'custom'], level: 'debug' }],
  });

  // Call again, this time no customizations (effectively disabling)
  system.setContextConfig(['tests', 'child'], {});

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
