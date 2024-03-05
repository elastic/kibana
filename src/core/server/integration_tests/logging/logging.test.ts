/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { LoggerContextConfigInput } from '@kbn/core-logging-server';
import { createRoot as createkbnTestServerRoot } from '@kbn/core-test-helpers-kbn-server';
import { InternalCoreSetup } from '@kbn/core-lifecycle-server-internal';
import { Subject } from 'rxjs';
import { unsafeConsole } from '@kbn/security-hardening';

function createRoot() {
  return createkbnTestServerRoot({
    logging: {
      appenders: {
        'test-console': {
          type: 'console',
          layout: {
            highlight: false,
            type: 'pattern',
            pattern: '%level|%logger|%message',
          },
        },
      },
      loggers: [
        {
          name: 'parent',
          appenders: ['test-console'],
          level: 'warn',
        },
        {
          name: 'parent.child',
          appenders: ['test-console'],
          level: 'error',
        },
      ],
    },
  });
}

describe('logging service', () => {
  describe('logs according to context name hierarchy', () => {
    let root: ReturnType<typeof createRoot>;
    let mockConsoleLog: jest.SpyInstance;
    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(unsafeConsole, 'log');
      root = createRoot();

      await root.preboot();
      await root.setup();
    });

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await root.shutdown();
    });

    it('uses the most specific context name', () => {
      const logger = root.logger.get('parent.child');

      logger.error('error from "parent.child" context');
      logger.warn('warning from "parent.child" context');
      logger.info('info from "parent.child" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'ERROR|parent.child|error from "parent.child" context'
      );
    });

    it('uses parent context name', () => {
      const logger = root.logger.get('parent.another-child');

      logger.error('error from "parent.another-child" context');
      logger.warn('warning from "parent.another-child" context');
      logger.info('info from "parent.another-child" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        1,
        'ERROR|parent.another-child|error from "parent.another-child" context'
      );
      expect(mockConsoleLog).toHaveBeenNthCalledWith(
        2,
        'WARN |parent.another-child|warning from "parent.another-child" context'
      );
    });

    it('falls back to the root settings', () => {
      const logger = root.logger.get('fallback');

      logger.error('error from "fallback" context');
      logger.warn('warning from fallback" context');
      logger.info('info from "fallback" context');

      // output muted by silent: true
      expect(mockConsoleLog).toHaveBeenCalledTimes(0);
    });
  });

  describe('custom context name configuration', () => {
    const CUSTOM_LOGGING_CONFIG: LoggerContextConfigInput = {
      appenders: {
        customJsonConsole: {
          type: 'console',
          layout: {
            type: 'json',
          },
        },
        customPatternConsole: {
          type: 'console',
          layout: {
            type: 'pattern',
            pattern: 'CUSTOM - PATTERN [%logger][%level] %message',
          },
        },
      },

      loggers: [
        { name: 'debug_json', appenders: ['customJsonConsole'], level: 'debug' },
        { name: 'debug_pattern', appenders: ['customPatternConsole'], level: 'debug' },
        { name: 'info_json', appenders: ['customJsonConsole'], level: 'info' },
        { name: 'info_pattern', appenders: ['customPatternConsole'], level: 'info' },
        {
          name: 'all',
          appenders: ['customJsonConsole', 'customPatternConsole'],
          level: 'debug',
        },
      ],
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let root: ReturnType<typeof createRoot>;
    let setup: InternalCoreSetup;
    let mockConsoleLog: jest.SpyInstance;
    const loggingConfig$ = new Subject<LoggerContextConfigInput>();
    const setContextConfig = async (enable: boolean) => {
      loggingConfig$.next(enable ? CUSTOM_LOGGING_CONFIG : {});
      // need to wait for config to reload. nextTick is enough, using delay just to be sure
      await delay(10);
    };

    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(unsafeConsole, 'log');
      root = createRoot();

      await root.preboot();
      setup = await root.setup();
      setup.logging.configure(['plugins', 'myplugin'], loggingConfig$);
    });

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await root.shutdown();
    });

    it('does not write to custom appenders when not configured', async () => {
      const logger = root.logger.get('plugins.myplugin.debug_pattern');
      await setContextConfig(false);
      logger.info('log1');
      await setContextConfig(true);
      logger.debug('log2');
      logger.info('log3');
      await setContextConfig(false);
      logger.info('log4');
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.debug_pattern][DEBUG] log2'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.debug_pattern][INFO ] log3'
      );
    });

    it('writes debug_json context to custom JSON appender', async () => {
      await setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.debug_json');
      logger.debug('log1');
      logger.info('log2');
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);

      const [firstCall, secondCall] = mockConsoleLog.mock.calls.map(([jsonString]) =>
        JSON.parse(jsonString)
      );
      expect(firstCall).toMatchObject({
        log: {
          level: 'DEBUG',
          logger: 'plugins.myplugin.debug_json',
        },
        message: 'log1',
      });
      expect(secondCall).toMatchObject({
        log: {
          level: 'INFO',
          logger: 'plugins.myplugin.debug_json',
        },
        message: 'log2',
      });
    });

    it('writes info_json context to custom JSON appender', async () => {
      await setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.info_json');
      logger.debug('i should not be logged!');
      logger.info('log2');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
        log: {
          level: 'INFO',
          logger: 'plugins.myplugin.info_json',
        },
        message: 'log2',
      });
    });

    it('writes debug_pattern context to custom pattern appender', async () => {
      await setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.debug_pattern');
      logger.debug('log1');
      logger.info('log2');

      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.debug_pattern][DEBUG] log1'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.debug_pattern][INFO ] log2'
      );
    });

    it('writes info_pattern context to custom pattern appender', async () => {
      await setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.info_pattern');
      logger.debug('i should not be logged!');
      logger.info('log2');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.info_pattern][INFO ] log2'
      );
    });

    it('writes all context to both appenders', async () => {
      await setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.all');
      logger.debug('log1');
      logger.info('log2');

      expect(mockConsoleLog).toHaveBeenCalledTimes(4);
      const logs = mockConsoleLog.mock.calls.map(([jsonString]) => jsonString);

      expect(JSON.parse(logs[0])).toMatchObject({
        log: {
          level: 'DEBUG',
          logger: 'plugins.myplugin.all',
        },
        message: 'log1',
      });
      expect(logs[1]).toEqual('CUSTOM - PATTERN [plugins.myplugin.all][DEBUG] log1');
      expect(JSON.parse(logs[2])).toMatchObject({
        log: {
          level: 'INFO',
          logger: 'plugins.myplugin.all',
        },
        message: 'log2',
      });
      expect(logs[3]).toEqual('CUSTOM - PATTERN [plugins.myplugin.all][INFO ] log2');
    });
  });
});
