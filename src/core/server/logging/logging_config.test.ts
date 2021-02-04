/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LoggingConfig, config } from './logging_config';

test('`schema` creates correct schema with defaults.', () => {
  expect(config.schema.validate({})).toMatchSnapshot();
});

test('`schema` throws if `root` logger does not have appenders configured.', () => {
  expect(() =>
    config.schema.validate({
      root: {
        appenders: [],
      },
    })
  ).toThrowErrorMatchingSnapshot();
});

test('`schema` throws if `root` logger does not have "default" appender configured.', () => {
  expect(() =>
    config.schema.validate({
      root: {
        appenders: ['console'],
      },
    })
  ).toThrowErrorMatchingSnapshot();
});

test('`getParentLoggerContext()` returns correct parent context name.', () => {
  expect(LoggingConfig.getParentLoggerContext('a.b.c')).toEqual('a.b');
  expect(LoggingConfig.getParentLoggerContext('a.b')).toEqual('a');
  expect(LoggingConfig.getParentLoggerContext('a')).toEqual('root');
});

test('`getLoggerContext()` returns correct joined context name.', () => {
  expect(LoggingConfig.getLoggerContext(['a', 'b', 'c'])).toEqual('a.b.c');
  expect(LoggingConfig.getLoggerContext(['a', 'b'])).toEqual('a.b');
  expect(LoggingConfig.getLoggerContext(['a'])).toEqual('a');
  expect(LoggingConfig.getLoggerContext([])).toEqual('root');
});

test('correctly fills in default config.', () => {
  const configValue = new LoggingConfig(config.schema.validate({}));

  expect(configValue.appenders.size).toBe(2);

  expect(configValue.appenders.get('default')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern', highlight: true },
  });
  expect(configValue.appenders.get('console')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern', highlight: true },
  });
});

test('correctly fills in custom `appenders` config.', () => {
  const configValue = new LoggingConfig(
    config.schema.validate({
      appenders: {
        console: {
          kind: 'console',
          layout: { kind: 'pattern' },
        },
      },
    })
  );

  expect(configValue.appenders.size).toBe(2);

  expect(configValue.appenders.get('default')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern', highlight: true },
  });

  expect(configValue.appenders.get('console')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern' },
  });
});

test('correctly fills in default `loggers` config.', () => {
  const configValue = new LoggingConfig(config.schema.validate({}));

  expect(configValue.loggers.size).toBe(1);
  expect(configValue.loggers.get('root')).toEqual({
    appenders: ['default'],
    context: 'root',
    level: 'info',
  });
});

test('correctly fills in custom `loggers` config.', () => {
  const configValue = new LoggingConfig(
    config.schema.validate({
      appenders: {
        file: {
          kind: 'file',
          layout: { kind: 'pattern' },
          path: 'path',
        },
      },
      loggers: [
        {
          appenders: ['file'],
          context: 'plugins',
          level: 'warn',
        },
        {
          context: 'plugins.pid',
          level: 'trace',
        },
        {
          appenders: ['default'],
          context: 'http',
          level: 'error',
        },
      ],
    })
  );

  expect(configValue.loggers.size).toBe(4);
  expect(configValue.loggers.get('root')).toEqual({
    appenders: ['default'],
    context: 'root',
    level: 'info',
  });
  expect(configValue.loggers.get('plugins')).toEqual({
    appenders: ['file'],
    context: 'plugins',
    level: 'warn',
  });
  expect(configValue.loggers.get('plugins.pid')).toEqual({
    appenders: ['file'],
    context: 'plugins.pid',
    level: 'trace',
  });
  expect(configValue.loggers.get('http')).toEqual({
    appenders: ['default'],
    context: 'http',
    level: 'error',
  });
});

test('fails if loggers use unknown appenders.', () => {
  const validateConfig = config.schema.validate({
    loggers: [
      {
        appenders: ['unknown'],
        context: 'some.nested.context',
      },
    ],
  });

  expect(() => new LoggingConfig(validateConfig)).toThrowErrorMatchingSnapshot();
});

describe('extend', () => {
  it('adds new appenders', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        appenders: {
          file1: {
            kind: 'file',
            layout: { kind: 'pattern' },
            path: 'path',
          },
        },
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        appenders: {
          file2: {
            kind: 'file',
            layout: { kind: 'pattern' },
            path: 'path',
          },
        },
      })
    );

    expect([...mergedConfigValue.appenders.keys()]).toEqual([
      'default',
      'console',
      'file1',
      'file2',
    ]);
  });

  it('overrides appenders', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        appenders: {
          file1: {
            kind: 'file',
            layout: { kind: 'pattern' },
            path: 'path',
          },
        },
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        appenders: {
          file1: {
            kind: 'file',
            layout: { kind: 'json' },
            path: 'updatedPath',
          },
        },
      })
    );

    expect(mergedConfigValue.appenders.get('file1')).toEqual({
      kind: 'file',
      layout: { kind: 'json' },
      path: 'updatedPath',
    });
  });

  it('adds new loggers', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        loggers: [
          {
            context: 'plugins',
            level: 'warn',
          },
        ],
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        loggers: [
          {
            context: 'plugins.pid',
            level: 'trace',
          },
        ],
      })
    );

    expect([...mergedConfigValue.loggers.keys()]).toEqual(['root', 'plugins', 'plugins.pid']);
  });

  it('overrides loggers', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        loggers: [
          {
            context: 'plugins',
            level: 'warn',
          },
        ],
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        loggers: [
          {
            appenders: ['console'],
            context: 'plugins',
            level: 'trace',
          },
        ],
      })
    );

    expect(mergedConfigValue.loggers.get('plugins')).toEqual({
      appenders: ['console'],
      context: 'plugins',
      level: 'trace',
    });
  });
});
