import * as mockSchema from '../../lib/schema';
import { LoggingConfig } from '../LoggingConfig';

test('`createSchema()` creates correct schema with defaults.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  expect(loggingConfigSchema.validate({})).toMatchSnapshot();
});

test('`createSchema()` throws if `root` logger does not have appenders configured.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);

  expect(() =>
    loggingConfigSchema.validate({
      root: {
        appenders: []
      }
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

test('correctly fills in default `appenders` config.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(loggingConfigSchema.validate({}));

  expect(config.appenders.size).toBe(1);

  expect(config.appenders.get('default')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern', highlight: true }
  });
});

test('correctly fills in custom `appenders` config.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        console: {
          kind: 'console',
          layout: { kind: 'pattern' }
        },
        file: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      }
    })
  );

  expect(config.appenders.size).toBe(3);

  expect(config.appenders.get('default')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern', highlight: true }
  });

  expect(config.appenders.get('console')).toEqual({
    kind: 'console',
    layout: { kind: 'pattern' }
  });

  expect(config.appenders.get('file')).toEqual({
    kind: 'file',
    path: 'path',
    layout: { kind: 'pattern' }
  });
});

test('correctly fills in default `loggers` config.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(loggingConfigSchema.validate({}));

  expect(config.loggers.size).toBe(1);
  expect(config.loggers.get('root')).toEqual({
    context: 'root',
    appenders: ['default'],
    level: 'info'
  });
});

test('correctly fills in custom `loggers` config.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const config = new LoggingConfig(
    loggingConfigSchema.validate({
      appenders: {
        file: {
          kind: 'file',
          path: 'path',
          layout: { kind: 'pattern' }
        }
      },
      loggers: [
        {
          context: 'plugins',
          appenders: ['file'],
          level: 'warn'
        },
        {
          context: 'plugins.pid',
          level: 'trace'
        },
        {
          context: 'http',
          level: 'error',
          appenders: ['default']
        }
      ]
    })
  );

  expect(config.loggers.size).toBe(4);
  expect(config.loggers.get('root')).toEqual({
    context: 'root',
    appenders: ['default'],
    level: 'info'
  });
  expect(config.loggers.get('plugins')).toEqual({
    context: 'plugins',
    appenders: ['file'],
    level: 'warn'
  });
  expect(config.loggers.get('plugins.pid')).toEqual({
    context: 'plugins.pid',
    appenders: ['file'],
    level: 'trace'
  });
  expect(config.loggers.get('http')).toEqual({
    context: 'http',
    appenders: ['default'],
    level: 'error'
  });
});

test('fails if loggers use unknown appenders.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const validateConfig = loggingConfigSchema.validate({
    loggers: [
      {
        context: 'some.nested.context',
        appenders: ['unknown']
      }
    ]
  });

  expect(
    () => new LoggingConfig(validateConfig)
  ).toThrowErrorMatchingSnapshot();
});
