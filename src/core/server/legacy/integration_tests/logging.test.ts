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

import {
  getPlatformLogsFromMock,
  getLegacyPlatformLogsFromMock,
} from '../../logging/integration_tests/utils';

import { LegacyLoggingConfig } from '../config/legacy_object_to_config_adapter';

function createRoot(legacyLoggingConfig: LegacyLoggingConfig = {}) {
  return kbnTestServer.createRoot({
    migrations: { skip: true }, // otherwise stuck in polling ES
    plugins: { initialize: false },
    logging: {
      // legacy platform config
      silent: false,
      json: false,
      ...legacyLoggingConfig,
      events: {
        log: ['test-file-legacy'],
      },
      // platform config
      appenders: {
        'test-console': {
          kind: 'console',
          layout: {
            highlight: false,
            kind: 'pattern',
          },
        },
      },
      loggers: [
        {
          context: 'test-file',
          appenders: ['test-console'],
          level: 'info',
        },
      ],
    },
  });
}

describe('logging service', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockStdout: jest.SpyInstance;

  beforeAll(async () => {
    mockConsoleLog = jest.spyOn(global.console, 'log');
    mockStdout = jest.spyOn(global.process.stdout, 'write');
  });

  afterAll(async () => {
    mockConsoleLog.mockRestore();
    mockStdout.mockRestore();
  });

  describe('compatibility', () => {
    describe('uses configured loggers', () => {
      let root: ReturnType<typeof createRoot>;
      beforeAll(async () => {
        root = createRoot();

        await root.setup();
        await root.start();
      }, 30000);

      afterAll(async () => {
        await root.shutdown();
      });

      beforeEach(() => {
        mockConsoleLog.mockClear();
        mockStdout.mockClear();
      });

      it('when context matches', async () => {
        root.logger.get('test-file').info('handled by NP');

        expect(mockConsoleLog).toHaveBeenCalledTimes(1);
        const loggedString = getPlatformLogsFromMock(mockConsoleLog);
        expect(loggedString).toMatchInlineSnapshot(`
          Array [
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] handled by NP",
          ]
        `);
      });

      it('falls back to the root legacy logger otherwise', async () => {
        root.logger.get('test-file-legacy').info('handled by LP');

        expect(mockStdout).toHaveBeenCalledTimes(1);

        const loggedString = getLegacyPlatformLogsFromMock(mockStdout);
        expect(loggedString).toMatchInlineSnapshot(`
          Array [
            "  log   [xx:xx:xx.xxx] [info][test-file-legacy] handled by LP
          ",
          ]
        `);
      });
    });

    describe('logging config respects legacy logging settings', () => {
      let root: ReturnType<typeof createRoot>;

      afterEach(async () => {
        mockConsoleLog.mockClear();
        mockStdout.mockClear();
        await root.shutdown();
      });

      it('"silent": true', async () => {
        root = createRoot({ silent: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        expect(mockConsoleLog).toHaveBeenCalledTimes(3);

        expect(getPlatformLogsFromMock(mockConsoleLog)).toMatchInlineSnapshot(`
          Array [
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error",
          ]
        `);

        mockStdout.mockClear();

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        expect(mockStdout).toHaveBeenCalledTimes(0);
      });

      it('"quiet": true', async () => {
        root = createRoot({ quiet: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        expect(mockConsoleLog).toHaveBeenCalledTimes(3);

        expect(getPlatformLogsFromMock(mockConsoleLog)).toMatchInlineSnapshot(`
          Array [
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error",
          ]
        `);

        mockStdout.mockClear();

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        expect(mockStdout).toHaveBeenCalledTimes(1);
        expect(getLegacyPlatformLogsFromMock(mockStdout)).toMatchInlineSnapshot(`
          Array [
            "  log   [xx:xx:xx.xxx] [error][test-file-legacy] error
          ",
          ]
        `);
      });

      it('"verbose": true', async () => {
        root = createRoot({ verbose: true });

        await root.setup();
        await root.start();

        const platformLogger = root.logger.get('test-file');
        platformLogger.info('info');
        platformLogger.warn('warn');
        platformLogger.error('error');

        expect(mockConsoleLog).toHaveBeenCalledTimes(3);

        expect(getPlatformLogsFromMock(mockConsoleLog)).toMatchInlineSnapshot(`
          Array [
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][INFO ][test-file] info",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][WARN ][test-file] warn",
            "[xxxx-xx-xxTxx:xx:xx.xxxZ][ERROR][test-file] error",
          ]
        `);

        mockStdout.mockClear();

        const legacyPlatformLogger = root.logger.get('test-file-legacy');
        legacyPlatformLogger.info('info');
        legacyPlatformLogger.warn('warn');
        legacyPlatformLogger.error('error');

        expect(mockStdout).toHaveBeenCalledTimes(3);
        expect(getLegacyPlatformLogsFromMock(mockStdout)).toMatchInlineSnapshot(`
          Array [
            "  log   [xx:xx:xx.xxx] [info][test-file-legacy] info
          ",
            "  log   [xx:xx:xx.xxx] [warning][test-file-legacy] warn
          ",
            "  log   [xx:xx:xx.xxx] [error][test-file-legacy] error
          ",
          ]
        `);
      });
    });
  });
});
