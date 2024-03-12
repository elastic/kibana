/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LoggingConfig, config } from './logging_config';

test('`schema` creates correct schema with defaults.', () => {
  expect(config.schema.validate({})).toMatchInlineSnapshot(`
    Object {
      "appenders": Map {},
      "browser": Object {
        "root": Object {
          "level": "info",
        },
      },
      "loggers": Array [],
      "root": Object {
        "appenders": Array [
          "default",
        ],
        "level": "info",
      },
    }
  `);
});

test('`schema` throws if `root` logger does not have appenders configured.', () => {
  expect(() =>
    config.schema.validate({
      root: {
        appenders: [],
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[root.appenders]: array size is [0], but cannot be smaller than [1]"`
  );
});

test('`schema` does not throw if `root` logger does not have "default" appender configured.', () => {
  expect(() =>
    config.schema.validate({
      root: {
        appenders: ['console'],
      },
    })
  ).not.toThrow();
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
    type: 'console',
    layout: { type: 'pattern', highlight: true },
  });
  expect(configValue.appenders.get('console')).toEqual({
    type: 'console',
    layout: { type: 'pattern', highlight: true },
  });
});

test('correctly fills in custom `appenders` config.', () => {
  const configValue = new LoggingConfig(
    config.schema.validate({
      appenders: {
        console: {
          type: 'console',
          layout: { type: 'pattern' },
        },
      },
    })
  );

  expect(configValue.appenders.size).toBe(2);

  expect(configValue.appenders.get('default')).toEqual({
    type: 'console',
    layout: { type: 'pattern', highlight: true },
  });
  expect(configValue.appenders.get('console')).toEqual({
    type: 'console',
    layout: { type: 'pattern' },
  });
});

test('correctly fills in default `loggers` config.', () => {
  const configValue = new LoggingConfig(config.schema.validate({}));

  expect(configValue.loggers.size).toBe(1);
  expect(configValue.loggers.get('root')).toEqual({
    appenders: ['default'],
    name: 'root',
    level: 'info',
  });
});

test('correctly fills in custom `loggers` config.', () => {
  const configValue = new LoggingConfig(
    config.schema.validate({
      appenders: {
        file: {
          type: 'file',
          layout: { type: 'pattern' },
          fileName: 'path',
        },
      },
      loggers: [
        {
          appenders: ['file'],
          name: 'plugins',
          level: 'warn',
        },
        {
          name: 'plugins.pid',
          level: 'trace',
        },
        {
          appenders: ['default'],
          name: 'http',
          level: 'error',
        },
      ],
    })
  );

  expect(configValue.loggers.size).toBe(4);
  expect(configValue.loggers.get('root')).toEqual({
    appenders: ['default'],
    name: 'root',
    level: 'info',
  });
  expect(configValue.loggers.get('plugins')).toEqual({
    appenders: ['file'],
    name: 'plugins',
    level: 'warn',
  });
  expect(configValue.loggers.get('plugins.pid')).toEqual({
    appenders: ['file'],
    name: 'plugins.pid',
    level: 'trace',
  });
  expect(configValue.loggers.get('http')).toEqual({
    appenders: ['default'],
    name: 'http',
    level: 'error',
  });
});

test('fails if loggers use unknown appenders.', () => {
  const validateConfig = config.schema.validate({
    loggers: [
      {
        appenders: ['unknown'],
        name: 'some.nested.context',
      },
    ],
  });

  expect(() => new LoggingConfig(validateConfig)).toThrowErrorMatchingInlineSnapshot(
    `"Logger \\"some.nested.context\\" contains unsupported appender key \\"unknown\\"."`
  );
});

describe('extend', () => {
  it('adds new appenders', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        appenders: {
          file1: {
            type: 'file',
            layout: { type: 'pattern' },
            fileName: 'path',
          },
        },
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        appenders: {
          file2: {
            type: 'file',
            layout: { type: 'pattern' },
            fileName: 'path',
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
            type: 'file',
            layout: { type: 'pattern' },
            fileName: 'path',
          },
        },
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        appenders: {
          file1: {
            type: 'file',
            layout: { type: 'json' },
            fileName: 'updatedPath',
          },
        },
      })
    );

    expect(mergedConfigValue.appenders.get('file1')).toEqual({
      type: 'file',
      layout: { type: 'json' },
      fileName: 'updatedPath',
    });
  });

  it('adds new loggers', () => {
    const configValue = new LoggingConfig(
      config.schema.validate({
        loggers: [
          {
            name: 'plugins',
            level: 'warn',
          },
        ],
      })
    );

    const mergedConfigValue = configValue.extend(
      config.schema.validate({
        loggers: [
          {
            name: 'plugins.pid',
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
            name: 'plugins',
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
            name: 'plugins',
            level: 'trace',
          },
        ],
      })
    );

    expect(mergedConfigValue.loggers.get('plugins')).toEqual({
      appenders: ['console'],
      name: 'plugins',
      level: 'trace',
    });
  });
});
