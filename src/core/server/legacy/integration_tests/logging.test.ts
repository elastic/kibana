/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LegacyLoggingConfig } from '@kbn/config';
import * as kbnTestServer from '../../../test_helpers/kbn_server';

import {
  getPlatformLogsFromMock,
  getLegacyPlatformLogsFromMock,
} from '../../logging/integration_tests/utils';

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
