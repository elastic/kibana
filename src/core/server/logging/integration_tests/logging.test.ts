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

import * as kbnTestServer from '../../../../test_utils/kbn_server';
import { InternalCoreSetup } from '../../internal_types';
import { LoggerContextConfigInput } from '../logging_config';
import { Subject } from 'rxjs';

function createRoot() {
  return kbnTestServer.createRoot({
    logging: {
      silent: true, // set "true" in kbnTestServer
      appenders: {
        'test-console': {
          kind: 'console',
          layout: {
            highlight: false,
            kind: 'pattern',
            pattern: '%level|%logger|%message',
          },
        },
      },
      loggers: [
        {
          context: 'parent',
          appenders: ['test-console'],
          level: 'warn',
        },
        {
          context: 'parent.child',
          appenders: ['test-console'],
          level: 'error',
        },
      ],
    },
  });
}

describe('logging service', () => {
  describe('logs according to context hierarchy', () => {
    let root: ReturnType<typeof createRoot>;
    let mockConsoleLog: jest.SpyInstance;
    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(global.console, 'log');
      root = createRoot();

      await root.setup();
    }, 30000);

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await root.shutdown();
    });

    it('uses the most specific context', () => {
      const logger = root.logger.get('parent.child');

      logger.error('error from "parent.child" context');
      logger.warn('warning from "parent.child" context');
      logger.info('info from "parent.child" context');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'ERROR|parent.child|error from "parent.child" context'
      );
    });

    it('uses parent context', () => {
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

  describe('custom context configuration', () => {
    const CUSTOM_LOGGING_CONFIG: LoggerContextConfigInput = {
      appenders: {
        customJsonConsole: {
          kind: 'console',
          layout: {
            kind: 'json',
          },
        },
        customPatternConsole: {
          kind: 'console',
          layout: {
            kind: 'pattern',
            pattern: 'CUSTOM - PATTERN [%logger][%level] %message',
          },
        },
      },

      loggers: [
        { context: 'debug_json', appenders: ['customJsonConsole'], level: 'debug' },
        { context: 'debug_pattern', appenders: ['customPatternConsole'], level: 'debug' },
        { context: 'info_json', appenders: ['customJsonConsole'], level: 'info' },
        { context: 'info_pattern', appenders: ['customPatternConsole'], level: 'info' },
        {
          context: 'all',
          appenders: ['customJsonConsole', 'customPatternConsole'],
          level: 'debug',
        },
      ],
    };

    let root: ReturnType<typeof createRoot>;
    let setup: InternalCoreSetup;
    let mockConsoleLog: jest.SpyInstance;
    const loggingConfig$ = new Subject<LoggerContextConfigInput>();
    const setContextConfig = (enable: boolean) =>
      enable ? loggingConfig$.next(CUSTOM_LOGGING_CONFIG) : loggingConfig$.next({});
    beforeAll(async () => {
      mockConsoleLog = jest.spyOn(global.console, 'log');
      root = kbnTestServer.createRoot();

      setup = await root.setup();
      setup.logging.configure(['plugins', 'myplugin'], loggingConfig$);
    }, 30000);

    beforeEach(() => {
      mockConsoleLog.mockClear();
    });

    afterAll(async () => {
      mockConsoleLog.mockRestore();
      await root.shutdown();
    });

    it('does not write to custom appenders when not configured', async () => {
      const logger = root.logger.get('plugins.myplugin.debug_pattern');
      setContextConfig(false);
      logger.info('log1');
      setContextConfig(true);
      logger.debug('log2');
      logger.info('log3');
      setContextConfig(false);
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
      setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.debug_json');
      logger.debug('log1');
      logger.info('log2');
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);

      const [firstCall, secondCall] = mockConsoleLog.mock.calls.map(([jsonString]) =>
        JSON.parse(jsonString)
      );
      expect(firstCall).toMatchObject({
        level: 'DEBUG',
        context: 'plugins.myplugin.debug_json',
        message: 'log1',
      });
      expect(secondCall).toMatchObject({
        level: 'INFO',
        context: 'plugins.myplugin.debug_json',
        message: 'log2',
      });
    });

    it('writes info_json context to custom JSON appender', async () => {
      setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.info_json');
      logger.debug('i should not be logged!');
      logger.info('log2');

      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(JSON.parse(mockConsoleLog.mock.calls[0][0])).toMatchObject({
        level: 'INFO',
        context: 'plugins.myplugin.info_json',
        message: 'log2',
      });
    });

    it('writes debug_pattern context to custom pattern appender', async () => {
      setContextConfig(true);
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
      setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.info_pattern');
      logger.debug('i should not be logged!');
      logger.info('log2');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CUSTOM - PATTERN [plugins.myplugin.info_pattern][INFO ] log2'
      );
    });

    it('writes all context to both appenders', async () => {
      setContextConfig(true);
      const logger = root.logger.get('plugins.myplugin.all');
      logger.debug('log1');
      logger.info('log2');

      expect(mockConsoleLog).toHaveBeenCalledTimes(4);
      const logs = mockConsoleLog.mock.calls.map(([jsonString]) => jsonString);

      expect(JSON.parse(logs[0])).toMatchObject({
        level: 'DEBUG',
        context: 'plugins.myplugin.all',
        message: 'log1',
      });
      expect(logs[1]).toEqual('CUSTOM - PATTERN [plugins.myplugin.all][DEBUG] log1');
      expect(JSON.parse(logs[2])).toMatchObject({
        level: 'INFO',
        context: 'plugins.myplugin.all',
        message: 'log2',
      });
      expect(logs[3]).toEqual('CUSTOM - PATTERN [plugins.myplugin.all][INFO ] log2');
    });
  });
});
