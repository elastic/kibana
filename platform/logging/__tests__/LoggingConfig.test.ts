import * as mockSchema from '../../lib/schema';
import { LoggingConfig } from '../LoggingConfig';

test('`createSchema()` creates correct schema with defaults.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  expect(loggingConfigSchema.validate({})).toMatchSnapshot();

  expect(() =>
    loggingConfigSchema.validate({
      loggers: {
        notRoot: {
          appenders: ['console']
        }
      }
    })
  ).toThrowErrorMatchingSnapshot();

  expect(() =>
    loggingConfigSchema.validate({
      loggers: {
        root: {
          appenders: []
        }
      }
    })
  ).toThrowErrorMatchingSnapshot();
});

test('`getParentLoggerContext()` returns correct parent context name.', () => {
  expect(LoggingConfig.getParentLoggerContext('a::b::c')).toEqual('a::b');
  expect(LoggingConfig.getParentLoggerContext('a::b')).toEqual('a');
  expect(LoggingConfig.getParentLoggerContext('a')).toEqual('root');
});

test('correctly fills in `appenders` config.', () => {
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

  expect(config.appenders.size).toBe(2);
  expect(config.appenders.get('console')).toEqual({
    kind: 'console',
    layout: {
      kind: 'pattern',
      pattern: '[{timestamp}][{level}][{context}] {message}',
      highlight: false
    }
  });

  expect(config.appenders.get('file')).toEqual({
    kind: 'file',
    path: 'path',
    layout: {
      kind: 'pattern',
      pattern: '[{timestamp}][{level}][{context}] {message}',
      highlight: false
    }
  });
});

test('correctly fills in `loggers` config.', () => {
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
      },
      loggers: {
        root: {
          appenders: ['console']
        },
        plugins: {
          appenders: ['file'],
          level: 'warn'
        },
        'plugins::pid': {
          level: 'trace'
        },
        http: {
          level: 'error'
        }
      }
    })
  );

  expect(config.loggers.size).toBe(4);
  expect(config.loggers.get('root')).toEqual({
    appenders: ['console'],
    level: 'info'
  });
  expect(config.loggers.get('plugins')).toEqual({
    appenders: ['file'],
    level: 'warn'
  });
  expect(config.loggers.get('plugins::pid')).toEqual({
    appenders: ['file'],
    level: 'trace'
  });
  expect(config.loggers.get('http')).toEqual({
    appenders: ['console'],
    level: 'error'
  });
});

test('fails if loggers use unknown appenders.', () => {
  const loggingConfigSchema = LoggingConfig.createSchema(mockSchema);
  const validateConfig = loggingConfigSchema.validate({
    loggers: {
      root: {
        appenders: ['file']
      }
    }
  });

  expect(
    () => new LoggingConfig(validateConfig)
  ).toThrowErrorMatchingSnapshot();
});
